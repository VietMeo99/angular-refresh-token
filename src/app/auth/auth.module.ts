import { NgModule } from '@angular/core';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';

import { BruteForceInterceptor } from './http-interceptors/brute-force.interceptor';
import { CaughtInterceptor } from './http-interceptors/caught.interceptor';
import { RetryWhenInterceptor } from './http-interceptors/retry-when.interceptor';
import { AuthService } from './auth.service';
import { BrowserModule } from '@angular/platform-browser';

@NgModule({
  // imports: [HttpClientModule],
  providers: [
    AuthService,
    /*{
      provide: HTTP_INTERCEPTORS,
      useClass: RetryWhenInterceptor,
      multi: true
    }*/
    {
      provide: HTTP_INTERCEPTORS,
      useClass: BruteForceInterceptor,
      multi: true,
    },
  ],
})
export class AuthModule {}
