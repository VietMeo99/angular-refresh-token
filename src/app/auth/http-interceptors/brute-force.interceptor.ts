import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { throwError, Observable, BehaviorSubject } from 'rxjs';
import { catchError, concatMap, filter, finalize, take } from 'rxjs/operators';

import { environment } from '@app/env';
import { AuthService, RefreshTokenResult } from '../auth.service';

@Injectable()
export class BruteForceInterceptor implements HttpInterceptor {
  isRefreshingToken = false;

  tokenRefreshed$ = new BehaviorSubject<boolean>(false);

  constructor(private authService: AuthService) {}

  addToken(req: HttpRequest<any>): HttpRequest<any> {
    const token = this.authService.token;
    return token
      ? req.clone({ setHeaders: { Authorization: 'Bearer ' + token } })
      : req;
  }

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(this.addToken(req)).pipe(
      catchError((err) => {
        if (err.status === 401) {
          return this.handle401Error(req, next);
        }

        return throwError(err);
      })
    );
  }

  // Trường hợp cụ thể mà take(1) có tác dụng là đảm bảo rằng chỉ có một giá trị từ phản hồi JSON
  // của yêu cầu API được lấy.
  // Trong phần còn lại của Observable, các giá trị tiếp theo(nếu có) sẽ không được xử lý.

  // Một yêu cầu API thông thường trả về một luồng dữ liệu,
  // và việc sử dụng take(1) có thể đảm bảo rằng chỉ có một giá trị đầu tiên
  // từ phản hồi của yêu cầu API được lấy và sử dụng.
  // Sau khi lấy giá trị đầu tiên, Observable kết thúc và không còn xử lý các giá trị tiếp theo.
  private handle401Error(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<any> {
    if (this.isRefreshingToken) {
      return this.tokenRefreshed$.pipe(
        filter(Boolean),
        take(1),
        concatMap(() => next.handle(this.addToken(req)))
      );
    }

    this.isRefreshingToken = true;

    // Reset here so that the following requests wait until the token
    // comes back from the refreshToken call.
    this.tokenRefreshed$.next(false);

    return this.authService.refreshToken().pipe(
      concatMap((res: RefreshTokenResult) => {
        if (!environment.production) {
          console.info('Token was successfully refreshed'); // tslint:disable-line
        }

        this.tokenRefreshed$.next(true);
        return next.handle(this.addToken(req));
      }),
      catchError((err) => {
        this.authService.logout();
        return throwError(err);
      }),
      finalize(() => {
        this.isRefreshingToken = false;
      })
    );
  }
}
