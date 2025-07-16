import { Component } from '@angular/core';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-invoice',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './invoice.component.html',
  styleUrls: ['./invoice.component.css']
})
export class InvoiceComponent {
  vbeln: string = '';
  posnr: string = '';
  pdfUrl: SafeResourceUrl | null = null;
  rawPdfUrl: string | null = null;
  errorMessage: string = '';
  loading: boolean = false;

  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}

  fetchInvoicePdf() {
    this.errorMessage = '';
    this.pdfUrl = null;
    this.rawPdfUrl = null;

    if (!this.vbeln || !this.posnr) {
      this.errorMessage = 'Please enter both Invoice Number and Item Number.';
      return;
    }

    this.loading = true;

    const body = { vbeln: this.vbeln, posnr: this.posnr };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    this.http.post<any>('http://localhost:3000/api/invoice-pdf', body, { headers }).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.status === 'S' && res.pdfBase64) {
          const byteCharacters = atob(res.pdfBase64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          this.rawPdfUrl = url;
          this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        } else {
          this.errorMessage = res.error || 'No PDF found.';
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error || 'Failed to fetch PDF. Please try again.';
      }
    });
  }

  downloadPdf() {
    if (this.rawPdfUrl) {
      const link = document.createElement('a');
      link.href = this.rawPdfUrl;
      link.download = `invoice_${this.vbeln}_${this.posnr}.pdf`;
      link.click();
    }
  }
}
