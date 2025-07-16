import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { InquiryComponent } from '../../components/sales/inquiry/inquiry.component';
import { SalesOrderComponent } from '../../components/sales/sales-order/sales-order.component';
import { DeliveryComponent } from '../../components/sales/delivery/delivery.component';
import { InvoiceComponent } from '../../components/finance/invoice/invoice.component';
import { PaymentsAgingComponent } from '../../components/finance/payments-aging/payments-aging.component';
import { CreditDebitMemoComponent } from '../../components/finance/credit-debit-memo/credit-debit-memo.component';
import { OverallSalesComponent } from '../../components/finance/overall-sales/overall-sales.component';
import { CustomerProfileComponent } from '../customer-profile/customer-profile.component';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InquiryComponent,
    SalesOrderComponent,
    DeliveryComponent,
    InvoiceComponent,
    PaymentsAgingComponent,
    CreditDebitMemoComponent,
    OverallSalesComponent,
    CustomerProfileComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(-100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ])
    ])
  ]
})
export class DashboardComponent implements OnInit {
  activeSection: string = 'profile';
  customerId: string = '';

  // toggles
  showSales: boolean = false;
  showFinance: boolean = false;

  // sub-sections
  salesSubSection: string = 'inquiry';
  financeSubSection: string = 'invoice';

  constructor(private router: Router) {
    // The customerId initialization is now handled in ngOnInit
  }

  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      this.customerId = localStorage.getItem('CUS_ID') || '';
    }
    if (!this.customerId) {
      this.router.navigate(['/']);
    }
  }

  logout() {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('CUS_ID');
    }
    this.customerId = '';
    this.router.navigate(['/']);
  }

  setActiveSection(section: string) {
    this.activeSection = section;

    if (section === 'sales') {
      this.showSales = true;
      this.showFinance = false;
      this.salesSubSection = 'inquiry'; // default
    } else if (section === 'finance') {
      this.showFinance = true;
      this.showSales = false;
      this.financeSubSection = 'invoice'; // default
    } else {
      this.showSales = false;
      this.showFinance = false;
    }
  }

  toggleSales() {
    this.setActiveSection('sales');
  }

  toggleFinance() {
    this.setActiveSection('finance');
  }

  setSalesSubSection(sub: string) {
    this.salesSubSection = sub;
  }

  setFinanceSubSection(sub: string) {
    this.financeSubSection = sub;
  }
}
