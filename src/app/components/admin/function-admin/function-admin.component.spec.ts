import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FunctionAdminComponent } from './function-admin.component';

describe('FunctionAdminComponent', () => {
  let component: FunctionAdminComponent;
  let fixture: ComponentFixture<FunctionAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FunctionAdminComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FunctionAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
