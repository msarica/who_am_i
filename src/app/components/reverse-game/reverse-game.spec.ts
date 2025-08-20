import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReverseGameComponent } from './reverse-game';

describe('ReverseGameComponent', () => {
  let component: ReverseGameComponent;
  let fixture: ComponentFixture<ReverseGameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReverseGameComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ReverseGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
