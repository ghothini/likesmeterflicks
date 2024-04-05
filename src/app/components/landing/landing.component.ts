import { Component, EventEmitter, HostListener, OnInit, Output, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';
import { SharedService } from 'src/app/services/shared.service';
import { AdComponent } from '../ad/ad.component';
import { MatSidenav } from '@angular/material/sidenav';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import Typed from 'typed.js';
import { AboutComponent } from '../about/about.component';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent implements OnInit {
  navItems: any[] = [0, '/', 0];
  flicksTitles: string[] = ['Recently Added', 'Films', 'TV Shows'];
  isContentChanged: boolean = false;
  isServerError: boolean = false;
  showPaginator: boolean = false;
  selectedTitle: any = 0;
  allMovies: any[] = [];
  allMoviesYearsArr: any[] = [];
  onlyFilmsFlicks: any[] = [];
  onlyTvShowsFlicks: any[] = [];
  backupAllMovies: any;
  hoveredMovie: any;
  moviesLikesSelection: any = null;
  spinnerElement: any;
  hideSpinner: boolean = false;
  loadingEnded: boolean = false;
  reRunMeter: boolean = false;
  reRunMainMeter: boolean = false;
  screenWidth!: number;
  totalItems!: number;
  currentPageIndex: number = 0;
  itemsToShowOnCurrentPage!: any[];
  paginatorData: any;
  totalFilms: number = 0;
  totalTvShows: number = 0;
  doAutoTyping: boolean = false;
  appTitleElement: any;

  @ViewChild('sideNav') sidenav!: MatSidenav;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  constructor(private router: Router, private api: ApiService, private dialog: MatDialog, private sharedService: SharedService) {
    let stopRunning: boolean = false;
    let stopRunningAd: boolean = false;
    setInterval(() => {
      if (!stopRunning) {
        this.loadingEnded = true;
        this.getAllFlicks();
        this.runMeter();
        stopRunning = true;

        // Show ad after 20 seconds from loading
        setInterval(() => {
          if (!stopRunningAd) {
            this.cookieAd();
            stopRunningAd = true;
          }
        }, 20000);
      }
    }, 2000)

    this.sharedService.watchMeterRuns().subscribe((changes: any) => {
      this.reRunMeter = !this.reRunMeter;
      this.reRunMainMeter = !this.reRunMainMeter;
      if (changes === 80) {
        this.navItems[0] = 0;
        return;
      }
      if (changes === 90) {
        this.navItems[2] = 0;
        return;
      }
    })

    this.sharedService.watchSideNavToggles().subscribe((changes: any) => this.sidenav.toggle());
  }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    let likesElement = document.getElementById('like') as HTMLElement;
    let elementRight = -116;
    let elementHeight = 41;
    let countPassedSec = 0;
    likesElement.style.right = (`116px`)
    let iconToogle: boolean = true;
    setInterval(() => {
      likesElement.classList.remove('hide');
      iconToogle = !iconToogle;
      if (elementRight > -116) {
        likesElement.style.right = (`${-116}px`);
        likesElement.style.height = (`${41}px`);
        return;
      }
      if (iconToogle) {
        likesElement.style.rotate = '4deg';
      } else {
        likesElement.style.rotate = '-4deg';
      }
      if (countPassedSec >= 600) {
        elementHeight += -1;
        elementRight += 1;
        likesElement.style.right = (`${elementRight}px`);
        likesElement.style.height = (`${elementHeight}px`);
      } else {
        elementHeight += 1;
        elementRight += -1;
        likesElement.style.right = (`${elementRight}px`);
        likesElement.style.height = (`${elementHeight}px`);
        countPassedSec += 110;
      }
    }, 130)
    const loaderDotsElement = document.getElementById('loader-dots') as HTMLElement;
    var typed = new Typed(loaderDotsElement, {
      strings: ['...'],
      typeSpeed: 150,
      backSpeed: 150,
      loop: true,
      showCursor: false
    })
  }

  @HostListener('window:resize', ['$event'])
  onresize(event: any) {
    this.handleScreenWidthChanges()
  }

  handleScreenWidthChanges() {
    this.screenWidth = window.innerWidth;
    if (this.screenWidth <= 600) {
      this.sidenav.close()
      return;
    }
    this.sidenav.open()
  }

  runMeter(): void {
    setInterval(() => {
      if (Number(this.navItems[0]) < 80) this.navItems[0] = Number(this.navItems[0]) + 5;
      if (Number(this.navItems[2]) < 90) { this.navItems[2] = Number(this.navItems[2]) + 5 };
    }, 80)
  }

  getAllFlicks(): void {
    this.api.genericGet('/getMovies')
      .subscribe({
        next: (res: any) => {
          this.hideSpinner = true;
          this.showPaginator = true;
          // Calc total separated
          this.totalFilms = 0;
          this.totalTvShows = 0;
          res.forEach((movie: any) => {
            let temp = movie.likes;
            temp = temp.split(' ')
            const isFilm = temp[temp.length - 1]
            if (isFilm === 'film') this.totalFilms++;
            if (isFilm === 'show') this.totalTvShows++;
          })
          this.formatApiData(res);
          // Avoid null
          const searchElement = document.getElementById('search') as HTMLInputElement;
          searchElement?.addEventListener('focusout', () => {
            searchElement.value = "";
          })
        },
        error: (err: any) => {
          this.hideSpinner = true;
          this.isServerError = true;
        },
        complete: () => { }
      })
  }

  changeFlicksContent(indx: any): void {
    if (indx === 1) return;
    this.hideSpinner = false;
    this.moviesLikesSelection = indx;
    this.isContentChanged = true;
    switch (indx) {
      case 0:
        this.router.navigate(['/landing/eighty']);
        this.api.genericGet('/getMovies')
          .subscribe((workingRes: any) => this.hideSpinner = true, (error: any) => {
            this.hideSpinner = true;
          });
        this.sharedService.runMeterAgain(80)
        break;
      case 2:
        this.router.navigate(['/landing/ninety']);
        this.api.genericGet('/getMovies')
          .subscribe((workingRes: any) => this.hideSpinner = true, (error: any) => {
            this.hideSpinner = true;
          });
        this.sharedService.runMeterAgain(90);
        break;
      case 3:
        this.moviesLikesSelection = null;
        this.router.navigate(['/landing'])
        this.api.genericGet('/getMovies')
          .subscribe((workingRes: any) => this.hideSpinner = true, (error: any) => {
            this.hideSpinner = true;
          });
        this.isContentChanged = false;
        // When coming back to landing tab
        this.getAllFlicks();
        break;
    }
  }

  makeAutoTyping() {
    this.doAutoTyping = true;
    this.appTitleElement = document.getElementById('auto-title-type') as HTMLElement;
    // Auto-type app title
    var typed = new Typed(this.appTitleElement, {
      strings: ['Likes', 'Likes Meter', 'Likes Meter Flicks'],
      typeSpeed: 150,
      backSpeed: 150,
      loop: true,
      showCursor: false
    })
    if (this.doAutoTyping) {
      setInterval(() => {
        this.doAutoTyping = false;
        typed.stop()
      }, 10200)
    }
  }

  changeFlicksTitle(indx: any) {
    if (this.selectedTitle === indx) {
      this.sidenav.toggle();
    }
    this.selectedTitle = indx;
    switch (indx) {
      case 0:
        this.filter('title', 'default');
        break;
      case 1:
        this.filter('title', 'film');
        break;
      case 2:
        this.filter('title', 'show');
        break;
      default:
        break;
    }
  }

  filter(key: any, filterValue: any) {
    if (key === 'title') {
      if (filterValue === 'default') {
        // Reset all movies to default flicks
        this.getAllFlicks()
        return;
      }
      if (filterValue === 'film') {
        this.allMovies = this.onlyFilmsFlicks;

      };
      if (filterValue === 'show') {
        this.allMovies = this.onlyTvShowsFlicks
      };
    } else if (key === 'year') {
      this.allMovies = this.backupAllMovies;
      const result = this.sharedService.extractFlicks(this.allMovies, filterValue)
      this.allMovies = result.allMovies;
      this.allMoviesYearsArr = result.allMoviesYearsArr.reverse();
    }
    this.paginator.firstPage();
    this.currentPageIndex = 0;
    this.updateItemsToShow(10);
  }


  formatApiData(res: any) {
    // Avoid appending when fetching data
    res.forEach((movie: any) => {
      let duration = movie.title.split(' ');
      duration = `${duration[duration.length - 2]} ${duration[duration.length - 1]}`
      movie['duration'] = duration;
      movie.title = movie.title.replace(` ‧ ${duration}`, '').split();
    })
    this.allMovies = res;
    // Backup for using all movies for filters
    this.backupAllMovies = this.allMovies;
    // Separate and assign flicks in advance
    const preSeparatedFlicks = this.sharedService.preSeparateFlicks(this.allMovies);
    this.onlyFilmsFlicks = preSeparatedFlicks.onlyFilmsFlicks;
    this.onlyTvShowsFlicks = preSeparatedFlicks.onlyTvShowsFlicks;
    const result = this.sharedService.extractFlicks(this.allMovies, undefined)
    this.allMovies = result.allMovies;
    // paginator
    this.updateItemsToShow(10);
    this.allMoviesYearsArr = result.allMoviesYearsArr.reverse();
  }

  // Method to update items to show on the current page
  updateItemsToShow(itemsPerPage: any) {
    this.totalItems = this.allMovies.length;
    const startIndex = this.currentPageIndex * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    this.itemsToShowOnCurrentPage = this.allMovies.slice(startIndex, endIndex);
  }

  followRoute(socialPlatform: any): void {
    switch (socialPlatform) {
      case 'x':
        if (this.moviesLikesSelection === 0) {
          window.open('https://twitter.com/80googleusersmovies/', "_blank");
          return;
        }
        window.open('https://twitter.com/90googleusersmovies/', "_blank");
        break;
      case 'instagram':
        if (this.moviesLikesSelection === 0) {
          window.open('https://instagram.com/80googleusersmovies/', "_blank");
          return;
        }
        window.open('https://instagram.com/90googleusersmovies/', "_blank");
        break;
      default:
        if (this.moviesLikesSelection === 0) {
          window.open('https://facebook.com/80googleusersmovies/', "_blank");
          return;
        }
        window.open('https://facebook.com/90googleusersmovies/', "_blank");
        break;
        break;
    }
  }

  openAboutLmf() {
    this.dialog.open(AboutComponent);
  }

  showCover(indx: any) {
    this.hoveredMovie = indx;
  }

  hideCover(): void {
    this.hoveredMovie = null;
  }

  reloadPage() {
    window.location.reload();
  }

  routeTo(moviePage: any) {
    // Send user to verify
    window.open(moviePage, "_blank");
  }

  getCookie(cName: any) {
    const name = cName + "=";
    const cDecoded = decodeURIComponent(document.cookie);
    const cArr = cDecoded.split("; ");
    let value;

    cArr.forEach((val: any) => {
      if (val.indexOf(name) === 0) {
        value = val.substring(name.length);
      }
    })
    return value;
  }

  cookieAd() {
    if (!this.getCookie('Ad')) {
      this.dialog.open(AdComponent, {
        disableClose: true
      });
    }
  }

  onPageChange(e: any) {
    this.currentPageIndex = e.pageIndex;
    this.updateItemsToShow(e.pageSize);
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    const searchResults = this.backupAllMovies.filter((movie: any) => movie.name.toLowerCase().includes(filterValue.trim().toLowerCase()));
    if (searchResults.length < 1) return;
    this.itemsToShowOnCurrentPage = searchResults;
  }

  showAllYears() {
    // Show all movies
    this.filter('title', 'default');
  }
}