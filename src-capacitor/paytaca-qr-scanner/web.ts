import { WebPlugin } from '@capacitor/core';
import type { PaytacaQRScannerPlugin, ScanOptions, ScanResult, CheckPermissionOptions, CheckPermissionResult, StopScanOptions } from './definitions';

export class PaytacaQRScannerWeb extends WebPlugin implements PaytacaQRScannerPlugin {
  async prepare(_options?: ScanOptions): Promise<void> {
    throw new Error('PaytacaQRScanner is not available on web. Use vue-qrcode-reader for desktop.');
  }

  async hideBackground(): Promise<void> {
    throw new Error('PaytacaQRScanner is not available on web.');
  }

  async showBackground(): Promise<void> {
    throw new Error('PaytacaQRScanner is not available on web.');
  }

  async startScan(_options?: ScanOptions): Promise<ScanResult> {
    throw new Error('PaytacaQRScanner is not available on web. Use vue-qrcode-reader for desktop.');
  }

  async stopScan(_options?: StopScanOptions): Promise<void> {
    throw new Error('PaytacaQRScanner is not available on web.');
  }

  async checkPermission(_options?: CheckPermissionOptions): Promise<CheckPermissionResult> {
    throw new Error('PaytacaQRScanner is not available on web.');
  }

  async openAppSettings(): Promise<void> {
    throw new Error('PaytacaQRScanner is not available on web.');
  }
}
