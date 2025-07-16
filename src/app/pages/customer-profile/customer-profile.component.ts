import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { trigger, style, animate, transition } from '@angular/animations';

interface CustomerProfile {
  CustomerId: string;
  Name1: string;
  Name2?: string;
  Country: string;
  Phone?: string;
  Mandt?: string;
}

@Component({
  selector: 'app-customer-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule],
  templateUrl: './customer-profile.component.html',
  styleUrls: ['./customer-profile.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.5s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class CustomerProfileComponent implements OnInit {
  customer: CustomerProfile | null = null;
  loading: boolean = true;
  error: string = '';
  customerId: string = '';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      this.customerId = localStorage.getItem('CUS_ID') || '';
    }
    this.fetchCustomerProfile();
  }

  fetchCustomerProfile(): void {
    if (!this.customerId) {
      this.error = 'No customer ID found. Please login again.';
      this.loading = false;
      this.router.navigate(['/login']);
      return;
    }

    this.http.post<any>('http://localhost:3000/api/get-profile', { customerId: this.customerId })
      .subscribe({
        next: (response) => {
          console.log('Profile response:', response);
          if (response.status === 'success' && response.profileData) {
            this.customer = response.profileData;
            this.error = '';
          } else {
            this.error = response.message || 'Could not fetch customer profile data';
            this.customer = null;
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Profile Error:', error);
          this.error = error.error?.message || 'Failed to load profile data. Please try again.';
          this.loading = false;
          this.customer = null;
        }
      });
  }

  refreshProfile(): void {
    this.loading = true;
    this.error = '';
    this.fetchCustomerProfile();
  }
}
