export class GameConnection {
  constructor() {
    this.peer = null;
    this.connection = null;
    this.onDataReceived = null;
    this.onOpponentConnected = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer({
          debug: 2
        });
        
        this.peer.on('open', () => {
          resolve();
        });
        
        this.peer.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async createRoom() {
    return new Promise((resolve) => {
      const roomId = this.peer.id;
      
      this.peer.on('connection', (conn) => {
        this.connection = conn;
        
        conn.on('open', () => {
          if (this.onOpponentConnected) {
            this.onOpponentConnected();
          }
        });
        
        conn.on('data', (data) => {
          if (this.onDataReceived) {
            this.onDataReceived(data);
          }
        });
      });
      
      resolve(roomId);
    });
  }

  async joinRoom(roomId) {
    return new Promise((resolve, reject) => {
      try {
        const conn = this.peer.connect(roomId);
        this.connection = conn;
        
        conn.on('open', () => {
          conn.on('data', (data) => {
            if (this.onDataReceived) {
              this.onDataReceived(data);
            }
          });
          
          resolve();
        });
        
        conn.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  sendData(data) {
    if (this.connection && this.connection.open) {
      this.connection.send(data);
    }
  }
}