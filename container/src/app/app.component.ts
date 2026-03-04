import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { EventBusService } from './services/event-bus.service';
import { initializeSeedData } from '@shared/data/seed-data';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, NavbarComponent],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
    constructor(private eventBus: EventBusService) { }

    ngOnInit(): void {
        initializeSeedData();
        this.eventBus.init();
    }
}
