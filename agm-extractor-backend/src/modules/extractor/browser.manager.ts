import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class BrowserManager implements OnModuleDestroy {
    private readonly logger = new Logger(BrowserManager.name);
    private browser: puppeteer.Browser | null = null;
    private useCount = 0;
    private isLaunching = false;
    private launchPromise: Promise<puppeteer.Browser> | null = null;

    // Recicla el browser cada N usos para evitar memory leaks acumulados
    private readonly RECYCLE_AFTER = 15;

    private readonly LAUNCH_ARGS = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--mute-audio',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
        '--js-flags=--max-old-space-size=256',
    ];

    async getBrowser(): Promise<puppeteer.Browser> {
        if (this.isLaunching && this.launchPromise) {
            return this.launchPromise;
        }

        const needsRecycle =
            !this.browser ||
            !this.browser.connected ||
            this.useCount >= this.RECYCLE_AFTER;

        if (needsRecycle) {
            this.isLaunching = true;
            this.launchPromise = this.launchBrowser();
            this.browser = await this.launchPromise;
            this.useCount = 0;
            this.isLaunching = false;
            this.launchPromise = null;
        }

        this.useCount++;
        return this.browser!;
    }

    private async launchBrowser(): Promise<puppeteer.Browser> {
        if (this.browser?.connected) {
            this.logger.log('Reciclando browser anterior...');
            await this.browser.close().catch(() => {});
        }

        this.logger.log('Lanzando nueva instancia de Chromium...');
        const browser = await puppeteer.launch({
            headless: true,
            executablePath: process.env.CHROMIUM_PATH || undefined,
            args: this.LAUNCH_ARGS,
        });

        browser.on('disconnected', () => {
            this.logger.warn('Browser desconectado inesperadamente, se relanzará en próximo uso.');
            this.browser = null;
            this.useCount = 0;
        });

        return browser;
    }

    async newPage(): Promise<puppeteer.Page> {
        const browser = await this.getBrowser();
        const page = await browser.newPage();

        await page.setRequestInterception(true);

        const BLOCKED_TYPES = new Set([
            'image', 'stylesheet', 'font',
            'media', 'manifest', 'other',
        ]);

        const BLOCKED_DOMAINS = [
            'google-analytics', 'googletagmanager',
            'facebook', 'hotjar', 'clarity.ms',
        ];

        page.on('request', (req) => {
            const type = req.resourceType();
            const url = req.url();

            if (
                BLOCKED_TYPES.has(type) ||
                BLOCKED_DOMAINS.some(d => url.includes(d))
            ) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.setViewport({ width: 1280, height: 800 });

        return page;
    }

    async onModuleDestroy() {
        if (this.browser?.connected) {
            this.logger.log('Cerrando browser al destruir módulo...');
            await this.browser.close().catch(() => {});
        }
    }
}