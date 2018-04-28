const LMT = 'MTS.lmt';
const LOCK = 'MTS.lock';
// language=JavaScript
const WorkerScript = `
  setInterval(function () {
    postMessage('ping');
  }, 500);
`;

function createWebWorker(onPing) {
  let WorkerBlob;
  if (Blob) {
    WorkerBlob = new Blob([WorkerScript], { type: 'text/javascript' });
  } else {
    WorkerBlob = new BlobBuilder();
    WorkerBlob.append(WorkerScript);
    WorkerBlob = WorkerBlob.getBlob();
  }

  const worker = new Worker(window.URL.createObjectURL(WorkerBlob));

  worker.onmessage = (msg) => {
    switch (msg.data) {
      case 'ping':
        onPing.call();
        break;
      default:
        break;
    }
  };
}

function updateLmt(value = +new Date()) {
  localStorage.setItem(LMT, value);
}

function checkLock() {
  return typeof localStorage[LOCK] !== 'undefined';
}

function lock() {
  localStorage[LOCK] = 1;
}

function unlock() {
  delete localStorage[lock];
}

function log(...messages) {
  console.log(
    `%c MTS %c ${messages.join(' ')} %c`,
    'background:#141421 ; padding: 1px; border-radius: 3px 0 0 3px;  color: #fff',
    'background:#2d2d56 ; padding: 1px; border-radius: 0 3px 3px 0;  color: #fff',
    'background:transparent',
  );
}

class MultiTabSingleton {
  constructor() {
    Object.defineProperties(this, {
      isMaster: { value: false, writable: true },
      onMasterHandlers: {
        value: [],
      },
    });

    createWebWorker(() => {
      if (this.isMaster) {
        updateLmt();
      } else {
        this.checkMaster();
      }
    });

    this.checkMaster();

    window.addEventListener('unload', () => {
      if (this.isMaster) {
        updateLmt(0);
      }
    }, true);
  }

  checkMaster() {
    if (checkLock()) {
      setTimeout(() => this.checkMaster(), 20);
      return;
    }

    lock();
    if (
      localStorage[LMT] === undefined ||
      localStorage[LMT] === 0 ||
      +new Date() - localStorage[LMT] > 1000
    ) {
      this.isMaster = true;
      updateLmt();
      log('This tab is Master');
      this.onMasterHandlers.forEach(handler => handler.call());
    }
    unlock();
  }

  onMaster(func) {
    this.onMasterHandlers.push(func);
    if (this.isMaster) {
      func.call();
    }
  }
}

let MTS = null;

export default function getMultiTabSingleton() {
  if (MTS === null) {
    MTS = new MultiTabSingleton();
  }
  return MTS;
}
