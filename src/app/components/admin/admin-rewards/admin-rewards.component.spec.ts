import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminRewardsComponent } from './admin-rewards.component';

describe('AdminRewardsComponent', () => {
  let component: AdminRewardsComponent;
  let fixture: ComponentFixture<AdminRewardsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminRewardsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminRewardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
