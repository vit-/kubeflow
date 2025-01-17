import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { V1PersistentVolumeClaim } from '@kubernetes/client-node';
import {
  DIALOG_RESP,
  NamespaceService,
  PollerService,
  STATUS_TYPE,
  ToolbarButton,
} from 'kubeflow';
import { Subscription } from 'rxjs';
import { ActionsService } from 'src/app/services/actions.service';
import { VWABackendService } from 'src/app/services/backend.service';

@Component({
  selector: 'app-volume-details-page',
  templateUrl: './volume-details-page.component.html',
  styleUrls: ['./volume-details-page.component.scss'],
})
export class VolumeDetailsPageComponent implements OnInit, OnDestroy {
  public name: string;
  public namespace: string;
  public pvc: V1PersistentVolumeClaim;
  public pvcInfoLoaded = false;
  public buttonsConfig: ToolbarButton[] = [
    new ToolbarButton({
      text: 'DELETE',
      icon: 'delete',
      tooltip: 'Delete this volume',
      fn: () => {
        this.deleteVolume();
      },
    }),
  ];

  pollSub = new Subscription();

  constructor(
    public ns: NamespaceService,
    public backend: VWABackendService,
    public poller: PollerService,
    public router: Router,
    public actions: ActionsService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.ns.updateSelectedNamespace(params.namespace);

      this.name = params.pvcName;
      this.namespace = params.namespace;

      this.poll(this.namespace, this.name);
    });
  }

  ngOnDestroy() {
    this.pollSub.unsubscribe();
  }

  private poll(namespace: string, name: string) {
    this.pollSub.unsubscribe();

    const request = this.backend.getPVC(namespace, name);

    this.pollSub = this.poller.exponential(request).subscribe(pvc => {
      this.pvc = pvc;
      this.pvcInfoLoaded = true;
    });
  }

  navigateBack() {
    this.router.navigate(['']);
  }

  private deleteVolume() {
    this.actions.deleteVolume(this.name, this.namespace).subscribe(result => {
      if (result !== DIALOG_RESP.ACCEPT) {
        return;
      }
      this.navigateBack();
    });
  }

  get status(): STATUS_TYPE {
    return this.getStatus(this.pvc);
  }

  getStatus(pvc: V1PersistentVolumeClaim): STATUS_TYPE {
    if (pvc?.metadata?.deletionTimestamp) {
      return STATUS_TYPE.TERMINATING;
    }
    if (pvc?.status?.phase === 'Bound') {
      return STATUS_TYPE.READY;
    } else {
      return STATUS_TYPE.WARNING;
    }
  }
}
