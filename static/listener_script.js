// listener_scripts.js

// 클라이언트 측 Socket.IO 연결 설정
var liSocket = io({
    transports: ['websocket'],
    upgrade: false,
    rememberUpgrade: false,
});

// 방송 URL을 업데이트하는 함수
function updateBroadcastUrl(url) {
    const broadcastUrlElement = document.getElementById('broadcastUrlElement');
    if (broadcastUrlElement) {
        broadcastUrlElement.textContent = `방송 URL: ${url}`;
    }
}

// 페이지 로드 시 사용자 정보 설정
window.onload = function () {
    var storedNickname = localStorage.getItem("nickname");

    if (storedNickname) {
        document.getElementById("nickInput").value = storedNickname;
    }

    // 페이지 로드 시 서버로부터 닉네임과 제목 가져오기
    fetchNicknameAndTitle();

    // 페이지 로드 시 방송 시작과 함께 타이머 시작
    startTimer();
};


// 방송 정보 업데이트 함수
function updateBroadcastInfo(content, nickname) {
    // 방송 정보를 표시하는 엘리먼트에 접근
    var titleElements = document.querySelectorAll('#broadcastInfo1 .titlename');
    var artistElements = document.querySelectorAll('#broadcastInfo1 .artist-name');

    // 엘리먼트의 내용을 업데이트
    titleElement.textContent = content;
    artistElement.textContent = nickname;
}

// Socket.IO 이벤트 핸들러 (서버로부터 방송 정보를 받아와서 동적으로 표시)
liSocket.on('update_broadcast_info', function (data) {
    // 현재 방송 정보를 업데이트
    updateBroadcastInfo(data.content, data.nickname);
});

// 방송 송출자로부터 음성 스트림을 수신하고 재생하는 코드
liSocket.on('play_broadcast', (audioStream) => {
    // 서버로부터 받은 오디오 스트림을 재생
    const audioPlayer = new Audio();
    audioPlayer.srcObject = audioStream;
    audioPlayer.play();

    // 방송 송출자로부터 음성 스트림을 수신하고 재생하는 코드
    socket.on('broadcast_audio', function (data) {
        var audioPlayer = document.getElementById('audioPlayer');

        // 음성 스트림을 오디오 플레이어에 설정
        audioPlayer.src = data.audioData;
        audioPlayer.play();
    });
});

liSocket.on('stop_broadcast', () => {
    // 방송 송출자가 연결을 끊었을 때 오디오를 중지
    var audioPlayer = document.getElementById('audioPlayer');
    audioPlayer.pause();
});

// 방송 정보 업데이트 이벤트 핸들러
liSocket.on('update_broadcast_data', function (data) {
    // 방송 정보 업데이트 코드 작성
    updateBroadcastInfo(data.content, data.nickname);
});

// 서버로부터 닉네임과 제목을 가져와서 화면에 표시하는 함수
function fetchNicknameAndTitle() {
    fetch('/get_nickname_and_title')
        .then(response => response.json())
        .then(data => {
            // broadcastContent와 broadcastNickname 엘리먼트 업데이트
            var broadcastContentElement = document.getElementById('broadcastContent');
            var broadcastNicknameElement = document.getElementById('broadcastNickname');

            if (broadcastContentElement && broadcastNicknameElement) {
                // 엘리먼트의 내용을 업데이트
                broadcastContentElement.textContent = data.title; // 여기에는 제목이 들어감
                broadcastNicknameElement.textContent = data.nickname; // 여기에는 닉네임이 들어감
            } else {
                console.error('Element with id "broadcastContent" or "broadcastNickname" not found.');
            }
        })
        .catch(error => console.error('Error:', error));
}

// 클라이언트에서 서버로 GET 요청을 보내는 코드
$.ajax({
    type: "GET",
    url: "/get_nickname_and_title",
    contentType: "application/json",
    success: function (data) {
        // data.nickname 및 data.title을 필요에 따라 사용
        console.log(data.nickname, data.title);
    },
    error: function (error) {
        console.error("닉네임과 제목을 가져오는 동안 오류 발생:", error);
    }
});

// 메시지 전송
function sendMessage() {
    var nickInput = document.getElementById("nickInput");
    var chatInput = document.getElementById("chatInput");
    var chatContainer = document.getElementById("chatContainer");

    if (nickInput.value.trim() !== "" && chatInput.value.trim() !== "") {
        var message = document.createElement("p");
        message.textContent = nickInput.value + ": " + chatInput.value;

        chatContainer.appendChild(message);

        chatInput.value = "";

        chatContainer.scrollTop = chatContainer.scrollHeight;

        localStorage.setItem("userNickname", nickInput.value);

        resetImagePreview();
    }
}

function handleKeyPress(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
}

function resetImagePreview() {
    var preview = document.getElementById("previewImage");
    preview.src = "";
    preview.style.display = "none";
}

setInterval(updateTimer, 1000);

// 변수 초기화: 방송 시작 시간과 타이머 간격
var startTime;
var timerInterval;

// 타이머 시작 함수
function startTimer() {
    // 현재 시간을 startTime에 저장
    startTime = new Date();
    // 1초 간격으로 updateTimer 함수를 호출하는 타이머 설정
    timerInterval = setInterval(updateTimer, 1000);
}

// 타이머 정지 함수
function stopTimer() {
    // 타이머 간격 해제
    clearInterval(timerInterval);
}

// 타이머 업데이트 함수
function updateTimer() {
    // 현재 시간을 가져와서 방송이 시작된 후 경과한 시간 계산
    var currentTime = new Date();
    var elapsedTime = Math.floor((currentTime - startTime) / 1000);

    // 경과 시간을 시, 분, 초로 변환
    var hours = Math.floor(elapsedTime / 3600);
    var minutes = Math.floor((elapsedTime % 3600) / 60);
    var seconds = elapsedTime % 60;

    // HTML에서 방송 시간을 표시할 태그의 id가 "broadcastTime"으로 가정
    var broadcastTimeElement = document.getElementById("broadcastTime");

    // 방송 시간을 HH:MM:SS 형식으로 설정
    broadcastTimeElement.textContent = pad(hours) + ":" + pad(minutes) + ":" + pad(seconds);
}

// 자릿수가 한 자리일 경우 앞에 0을 붙이는 함수
function pad(value) {
    return value < 10 ? "0" + value : value;
}

// Socket.IO 이벤트 핸들러 (서버로부터 방송 정보를 받아와서 동적으로 표시)
liSocket.on('update_broadcast_info', function (data) {
    // 현재 방송 정보를 업데이트
    var broadcastContent = document.querySelector('.titlename');
    var broadcastNickname = document.querySelector('.artist-name');

    broadcastContent.textContent = data.content;
    broadcastNickname.textContent = data.nickname;
});

function showPopup() {
    // 팝업을 생성합니다.
    var popup = document.createElement("div");
    popup.id = "popup";
    popup.innerHTML = `
      <h2>방송을 종료하시겠습니까?</h2>
      <button class="yes">네</button>
      <button class="no">아니오</button>
    `;
    document.body.appendChild(popup);

    // 네 버튼 클릭 이벤트 처리
    document.querySelector("#popup .yes").onclick = function () {
        // 팝업을 숨깁니다.
        popup.style.display = "none";

        // 메인 페이지로 이동합니다.
        window.location.href = "main.html";
    };

    // 아니오 버튼 클릭 이벤트 처리
    document.querySelector("#popup .no").onclick = function () {
        // 팝업을 숨깁니다.
        popup.style.display = "none";
    };
}

// 팝업을 보여주기 위해 함수 호출
showPopup();

// 진행자가 방송 종료 했을때 이벤트 핸들러
function onBroadcastEnd() {
    // 방송이 종료되었으므로 main.html로 이동합니다.
    window.location.href = "main.html";
}

// Socket.IO 이벤트 핸들러
liSocket.on('broadcast_end', onBroadcastEnd);

// 제목 이미지 출력 라인
liSocket.on('start_broadcast', function (data) {
    var broadcastContent = data['content'];
    var broadcastNickname = data['nickname'];

    // 가져온 데이터를 화면에 출력
    $('#broadcastContent').text(broadcastContent);
    $('#broadcastNickname').text(broadcastNickname);
});

// 청취자 페이지에서 호출
function updatePreviewImageForListener(imageUrl) {
    var imageElement = document.getElementById('listener_previewImage');
    imageElement.src = imageUrl;
}
