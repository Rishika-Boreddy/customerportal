import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InvoiceComponent } from '../../components/finance/invoice/invoice.component';
import { PaymentsAgingComponent } from '../../components/finance/payments-aging/payments-aging.component';
import { CreditDebitMemoComponent } from '../../components/finance/credit-debit-memo/credit-debit-memo.component';
import { OverallSalesComponent } from '../../components/finance/overall-sales/overall-sales.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InvoiceComponent,
    PaymentsAgingComponent,
    CreditDebitMemoComponent,
    OverallSalesComponent
  ],
  templateUrl: './finance.component.html',
  styleUrls: ['./finance.component.css']
})
export class FinanceComponent {
  activeTab: string = 'invoice';  // ✅ FIXED
}
