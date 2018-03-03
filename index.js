const lmt = 'MTS.lmt';
const lock = 'MTS.lock';
// language=JavaScript
const WorkerScript = `
  setInterval(function() {
    postMessage('ping');
  }, 500);
  onmessage = function() {
    postMessage('dead');
    close();
  };
`;

export default class MultiTabSingleton {
  constructor() {
    Object.defineProperties(this, {
      isMaster: { value: false, writable: true },
      onMasterHandlers: {
        value: [],
      },
    });
    this.createWebWorker();
  }

  createWebWorker() {
    if (this.worker)
      return;

    if (Blob) {
      var WorkerBlob = new Blob([WorkerScript], { type: 'text/javascript' });
    } else {
      var WorkerBlob = new BlobBuilder();
      WorkerBlob.append(WorkerScript);
      WorkerBlob = WorkerBlob.getBlob();
    }

    this.worker = new Worker(window.URL.createObjectURL(WorkerBlob));

    this.worker.onmessage = (msg) => {
      switch (msg.data) {
        case 'ping':
          if (this.isMaster) {
            this.updateLmt();
          } else {
            this.checkMaster();
          }
          break;
        case 'dead':
          delete this.worker;
          this.CreateWebWorker();
          break;
      }
    };

    window.addEventListener('unload', (e) => {
      if (this.isMaster)
        this.updateLmt(0);
    }, true);
    this.checkMaster();
  }

  checkMaster() {
    if (this.checkLock())
      return setTimeout(() => this.checkMaster(), 20);
    this.lock();
    if (localStorage[lmt] == undefined || localStorage[lmt] == 0 || +new Date - localStorage[lmt] > 1000) {
      this.log('This tab is Master');
      this.isMaster = true;
      this.updateLmt();
      this.onMasterHandlers.forEach(handler => handler.call());
    }
    this.unlock();
  }

  updateLmt(value = +new Date) {
    localStorage.setItem(lmt, value);
  }

  checkLock() {
    return typeof localStorage[lock] !== 'undefined';
  }

  lock() {
    localStorage[lock] = 1;
  }

  unlock() {
    delete localStorage[lock];
  }

  onMaster(func) {
    this.onMasterHandlers.push(func);
    if (this.isMaster)
      func.call();
  }

  log(...messages) {
    console.log(`%c MTS %c ${messages.join(' ')} %c`,
      'background:#141421 ; padding: 1px; border-radius: 3px 0 0 3px;  color: #fff',
      'background:#2d2d56 ; padding: 1px; border-radius: 0 3px 3px 0;  color: #fff',
      'background:transparent');
  }
}