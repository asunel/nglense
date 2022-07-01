import { Component, OnInit } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-root',
  template: `<div></div>`,
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit{
  title = 'test-project';

  ngOnInit() {
    this.testMethod1();
  }

  getEmployee() {
  }

  testMethod1 () {
    let subj = new Subject<boolean>();
    subj.subscribe();
  }
}
