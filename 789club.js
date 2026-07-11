const WebSocket = require('websocket').client;
const http = require('http');

// ================== CẤU HÌNH & BIẾN TOÀN CỤC ==================
const PORT = 10000;

let latestResult = {
  "Ket_qua": "Chưa có kết quả",
  "Phien": 0,
  "Tong": 0,
  "Xuc_xac_1": 0,
  "Xuc_xac_2": 0,
  "Xuc_xac_3": 0,
  "id": "@tranhoang2286"
};

let lastEventId = 19;
let wsClient = null;
let wsConnection = null;

// Cấu hình kết nối
const WS_URL = "wss://websocket.atpman.net/websocket";
const HEADERS = {
  "Host": "websocket.atpman.net",
  "Origin": "https://play.789club.sx",
  "User-Agent": "Mozilla/5.0",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Accept-Language": "vi-VN,vi;q=0.9",
  "Pragma": "no-cache",
  "Cache-Control": "no-cache"
};

// Tin nhắn gửi đi
const LOGIN_MESSAGE = [
  1,
  "MiniGame",
  "wanglin2019aaand",
  "WamgLin2091",
  {
    "info": "{\"ipAddress\":\"113.185.45.88\",\"wsToken\":\"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJlbXlldTE3ODljbHVuIiwiYm90IjowLCJpc01lcmNoYW50IjpmYWxzZSwidmVyaWZpZWRCYW5rQWNjb3VudCI6ZmFsc2UsInBsYXlFdmVudExvYmJ5IjpmYWxzZSwiY3VzdG9tZXJJZCI6NjU3NjU3NjksImFmZklkIjoiNzg5IiwiYmFubmVkIjpmYWxzZSwiYnJhbmQiOiI3ODkuY2x1YiIsInRpbWVzdGFtcCI6MTc2NjQ3MDk1NTY4OCwibG9ja0dhbWVzIjpbXSwiYW1vdW50IjowLCJsb2NrQ2hhdCI6ZmFsc2UsInBob25lVmVyaWZpZWQiOmZhbHNlLCJpcEFkZHJlc3MiOiIxMTMuMTg1LjQ1Ljg4IiwibXV0ZSI6ZmFsc2UsImF2YXRhciI6Imh0dHBzOi8vYXBpLnhldWkuaW8vaW1hZ2VzL2F2YXRhci9hdmF0YXJfMjUucG5nIiwicGxhdGZvcm1JZCI6NSwidXNlcklkIjoiMjFkMTUxMjEtYjIzOC00ZDIyLTgzMTMtNGI3YjYwN2VhZjIxIiwicmVnVGltZSI6MTc2NjQ3MDkzMDEwNCwicGhvbmUiOiIiLCJkZXBvc2l0IjpmYWxzZSwidXNlcm5hbWUiOiJTOF93YW5nbGluMjAxOWFhYW5kIn0.F5jr6g1BPGMQ-5EPRdck-PDvVDXcahyGySOFSjyNEuE\",\"locale\":\"vi\",\"userId\":\"21d15121-b238-4d22-8313-4b7b607eaf21\",\"username\":\"S8_wanglin2019aaand\",\"timestamp\":1766470955689,\"refreshToken\":\"34ed90232de44567aec7d4752b021717.e8cd9e15f74c42fb8bd491e395d73ab1\"}",
    "signature": "55A3202A0554F20C01D09CD018386265C93B292E843BE3722766912A8F01ACF50E9574D88D52FAFDABEBD4794D3306C87021EF3DD6B25DA102872D23C7C31A0F1D3EB99C0714968A64F6C40335726EB999F1CEAE49BC0954EABA48189E1BBE61BD40C898CA4D683DA76E24386F4431772D05BC8142DAEBFA90E27A9C250A5ED3"
  }
];

const SUBSCRIBE_TX_RESULT = [6, "MiniGame", "taixiuUnbalancedPlugin", {"cmd": 2000}];
const SUBSCRIBE_LOBBY = [6, "MiniGame", "lobbyPlugin", {"cmd": 10001}];

// ================== HÀM HỖ TRỢ ==================
function printJsonPretty(data, label = "") {
  if (label) {
    console.log("\n" + "=".repeat(50));
    console.log(`📋 ${label}`);
    console.log("=".repeat(50));
  }
  try {
    if (typeof data === 'object') {
      console.log(JSON.stringify(data, null, 2, 'utf8'));
    } else {
      console.log(data);
    }
  } catch (err) {
    console.log(data);
  }
}

// ================== WEBSOCKET XỬ LÝ ==================
function startWebSocket() {
  wsClient = new WebSocket();

  wsClient.on('connect', (connection) => {
    console.log("✅ Đã kết nối WebSocket thành công");
    wsConnection = connection;

    connection.on('message', (message) => {
      if (message.type === 'utf8') {
        try {
          const rawText = message.utf8Data;
          printJsonPretty(`📥 NHẬN: ${rawText.substring(0, 500)}...`, "TIN NHẮN GỐC");

          const data = JSON.parse(rawText);
          printJsonPretty(data, "ĐÃ PHÂN TÍCH");

          // Cập nhật lastEventId
          if (Array.isArray(data) && data.length >= 3 && data[0] === 7 && data[1] === "Simms" && typeof data[2] === "number") {
            const oldId = lastEventId;
            lastEventId = data[2];
            console.log(`🆔 Cập nhật ID sự kiện: ${oldId} → ${lastEventId}`);
          }

          // Xử lý kết quả Tài Xỉu
          if (Array.isArray(data)) {
            for (const item of data) {
              if (item && typeof item === 'object' && item.cmd === 2006) {
                const sid = item.sid || 0;
                const d1 = item.d1 || 0;
                const d2 = item.d2 || 0;
                const d3 = item.d3 || 0;
                const tong = d1 + d2 + d3;
                const ketqua = tong >= 11 ? "Tài" : "Xỉu";

                latestResult = {
                  "Ket_qua": ketqua,
                  "Phien": sid,
                  "Tong": tong,
                  "Xuc_xac_1": d1,
                  "Xuc_xac_2": d2,
                  "Xuc_xac_3": d3,
                  "id": "@tranhoang2286"
                };

                console.log("🎲 CẬP NHẬT KẾT QUẢ MỚI:");
                printJsonPretty(latestResult);
              }
              // Thông tin Lobby
              else if (item && typeof item === 'object' && item.cmd === 10001) {
                console.log("🏛️ Nhận dữ liệu phòng chơi");
              }
            }
          }

        } catch (err) {
          console.log("❌ Lỗi phân tích JSON:", err.message);
          console.log("📄 Nội dung:", message.utf8Data.substring(0, 200));
        }
      }
    });

    connection.on('close', (code, desc) => {
      console.log("🔌 Kết nối WebSocket đã đóng");
      console.log(`   Mã: ${code} | Thông báo: ${desc}`);
      console.log("🔄 Tự động kết nối lại sau 5 giây...");
      setTimeout(startWebSocket, 5000);
    });

    connection.on('error', (err) => {
      console.log("❌ Lỗi kết nối:", err);
    });

    // Gửi dữ liệu khởi tạo sau khi kết nối
    setTimeout(() => {
      console.log("📤 Gửi yêu cầu đăng nhập...");
      connection.sendUTF(JSON.stringify(LOGIN_MESSAGE));

      setTimeout(() => {
        console.log("📤 Đăng ký nhận kết quả Tài Xỉu...");
        connection.sendUTF(JSON.stringify(SUBSCRIBE_TX_RESULT));
        console.log("📤 Đăng ký thông tin phòng...");
        connection.sendUTF(JSON.stringify(SUBSCRIBE_LOBBY));
      }, 1000);

      // Gửi tin nhắn duy trì kết nối định kỳ
      setInterval(() => {
        if (connection.connected) {
          connection.sendUTF("2"); // Gửi Ping
          connection.sendUTF(JSON.stringify(SUBSCRIBE_TX_RESULT));
          connection.sendUTF(JSON.stringify([7, "Simms", lastEventId, 0, { id: 0 }]));
        }
      }, 10000);

    }, 500);
  });

  wsClient.on('connectFailed', (err) => {
    console.log("❌ Không thể kết nối:", err);
    console.log("🔄 Thử lại sau 5 giây...");
    setTimeout(startWebSocket, 5000);
  });

  // Bắt đầu kết nối
  console.log("🔄 Đang kết nối đến WebSocket...");
  wsClient.connect(WS_URL, null, null, HEADERS);
}

// ================== MÁY CHỦ HTTP ==================
function startHttpServer() {
  const server = http.createServer((req, res) => {
    // Cấu hình CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === "/taixiu" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(latestResult, null, 2, 'utf8'));
      console.log(`🌐 Đã trả dữ liệu cho yêu cầu: ${req.url}`);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Không tìm thấy đường dẫn này");
    }
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Máy chủ API đang chạy: http://localhost:${PORT}/taixiu`);
  });
}

// ================== KHỞI ĐỘNG TOÀN BỘ ==================
console.log("🚀 Đang khởi động hệ thống 789club...");
console.log(`📝 Tài khoản: wanglin2019aaand`);
console.log(`🌐 IP: 113.185.45.88`);
console.log("-".repeat(50));

startWebSocket();
startHttpServer();
