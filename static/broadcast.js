//broadcast.js

// 클라이언트 측 Socket.IO 연결 설정
var broSocket = io.connect('http://' + document.domain + ':' + location.port);

// 페이지 로드 시 사용자 정보 설정(페이지 로드 시 서버로부터 닉네임과 제목 가져오기)
window.onload = function () {
    var storedNickname = localStorage.getItem("nickname");
    var storedBroadcastContent = localStorage.getItem("content");


    if (storedNickname) {
        document.getElementById("nickname").value = storedNickname;
    }

    fetchNicknameAndTitle();
};

// 방송 URL을 업데이트하는 함수
function updateBroadcastUrl(url) {
    const broadcastUrlElement = document.getElementById('broadcastUrlElement');
    if (broadcastUrlElement) {
        broadcastUrlElement.textContent = `방송 URL: ${url}`;
    }
}

// Socket.IO 이벤트 핸들러 (서버로부터 방송 정보를 받아와서 동적으로 표시)
broSocket.on('broadcast_info', function (data) {
    // 방송 목록에 새로운 방송 추가
    var body = document.getElementById("body");
    var newBroadcast = document.createElement("div");
    newBroadcast.id = "broadcast_" + data.id;
    newBroadcast.className = "cell";
    newBroadcast.textContent = data.nickname;

    // 이미지가 있는 경우 이미지를 추가
    if (data.imagePath) {
        var image = document.createElement("img");
        image.className = "broadcast-image";
        image.src = data.imagePath;
        image.alt = "Broadcast Image";
        newBroadcast.appendChild(image);
    }

    body.appendChild(newBroadcast);
});




// Socket.IO 이벤트 핸들러 (서버로부터 방송 정보를 받아와서 동적으로 표시)
broSocket.on('update_broadcast_info', function (data) {
    // 현재 방송 정보를 업데이트
    updateBroadcastInfo(data.content, data.nickname);
});

// 방송 정보 업데이트 함수
function updateBroadcastInfo(content, nickname) {
    // 방송 정보를 표시하는 엘리먼트에 접근
    var titleElement = document.querySelector('#broadcastInfo1 .titlename');
    var artistElement = document.querySelector('#broadcastInfo1 .artist-name');

    // 엘리먼트의 내용을 업데이트
    titleElement.textContent = content;
    artistElement.textContent = nickname;
}

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

//오디오,이미지,타이머
// 전역 스코프에서 audioPlayer와 audioStream 변수를 선언합니다.
var audioPlayer;
var audioStream;

document.addEventListener('DOMContentLoaded', function () {
    // DOM이 완전히 로드된 후에 audioPlayer를 초기화합니다.
    audioPlayer = document.getElementById('audioPlayer');
    getAudioStream();

    // 'imageUploadForm'이라는 id를 가진 엘리먼트에 'submit' 이벤트 리스너를 추가합니다.
    document.getElementById('imageUploadForm').addEventListener('submit', function (e) {
        e.preventDefault(); // 폼의 기본 제출 동작을 막습니다.

        var imageFile = document.getElementById('imageInput').files[0]; // 'imageInput'이라는 id를 가진 input 엘리먼트에서 선택된 파일을 가져옵니다.
        var formData = new FormData(); // FormData 객체를 생성합니다.
        formData.append('image', imageFile); // FormData 객체에 선택된 파일을 추가합니다.

        // 이미지를 업로드합니다.
        fetch('/upload', {
            method: 'POST', // POST 방식으로 요청
            body: formData  // 요청 본문에는 formData를 추가. formData 안에는 업로드할 이미지 파일이 포함됩니다.
        })
            .then(response => response.json()) // 서버로부터 받은 응답을 JSON 형태로 변환합니다.
            .then(data => {
                // JSON 형태로 변환된 응답의 내용을 사용합니다. 
                console.log('받은 URL:', data.broadcastUrl); // 변환된 응답 중 'broadcastUrl'을 콘솔에 출력합니다.

                // 'imageElement'라는 id를 가진 HTML 요소의 src 속성에 URL을 할당합니다.
                // 이렇게 하면 해당 HTML 요소(이 경우 이미지 요소)에서 업로드한 이미지가 보여집니다.
                document.getElementById('imageElement').src = data.broadcastUrl;
            })
            .catch(error => {
                // 요청이나 응답 과정에서 오류가 발생하면 catch 블록이 실행됩니다.
                console.error(error); // 오류 내용을 콘솔에 출력합니다.
            });
    });

    // 'player'에 마우스가 진입했을 때 이벤트 추가
    $('#player').mouseenter(function () {
        $('.controls').addClass('visible');
        $('.info').addClass('up');
    });

    // 'player'에서 마우스가 빠져나갔을 때 이벤트 추가
    $('#player').mouseleave(function () {
        $('.controls').removeClass('visible');
        $('.info').removeClass('up');
    });

    // 하트, 셔플 클릭 이벤트 추가
    $('.heart, .shuffle').click(function () {
        console.log("Heart or shuffle clicked");
        $(this).toggleClass('clicked');
    });

    $('.pause').hide();


    //타이머 관련
    // 방송시간 나오는 부분
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

    // 페이지 로드 시 방송 시작과 함께 타이머 시작
    startTimer();


});

// 방송 종료 시 stopTimer 함수 호출
function stopBroadcast() {
    stopTimer();
    // 이후에 필요한 종료 처리를 추가하세요.
    // 예: 방송 종료 메시지를 표시하거나 다른 종료 관련 동작을 수행할 수 있습니다.
}

//이미지 선택 및 업로드를 처리하는 스크립트
function uploadImage() {
    var imageInput = document.getElementById("imageInput");

    // 이미지가 선택되었을 때만 실행
    if (imageInput.files.length > 0) {
        var formData = new FormData();
        formData.append("image", imageInput.files[0]);

        // 서버로 이미지를 전송
        fetch("/upload_image", {
            method: "POST",
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                // 이미지 업로드가 완료되면 해당 이미지를 방송 정보로 브로드캐스팅
                broSocket.emit('update_broadcast_image', { imagePath: data.imagePath });

                // 여기에서 방송 시작 처리를 추가할 수 있습니다.
                startBroadcastLogic();
            })
            .catch(error => console.error('Error:', error));
    } else {
        // 이미지가 선택되지 않았을 때의 처리
        console.log("이미지가 선택되지 않았습니다.");

        // 여기에서 방송 시작 처리를 추가할 수 있습니다.
        startBroadcastLogic();
    }
}

// 방송 시작에 필요한 로직을 처리하는 함수
function startBroadcastLogic() {
    // 여기에서 방송 시작에 필요한 로직을 추가할 수 있습니다.
    // 예: 서버에 방송 시작 이벤트를 전송하고, 방송 관련 설정을 초기화하는 등의 동작을 수행할 수 있습니다.
    console.log("방송 시작 로직을 처리합니다.");
}

// 마이크로폰에서 음성 가져오기
function getAudioStream() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            audioStream = stream; // 전역 변수에 오디오 스트림을 저장합니다.
            if (audioPlayer) {
                audioPlayer.srcObject = stream;
            } else {
                console.error('audioPlayer element is not found in the DOM.');
            }
        })
        .catch(error => {
            console.error('Error accessing microphone:', error);
        });
}



// getUserMedia()를 통해 오디오 스트림을 얻어옵니다. 마이크로폰에서 서버로 음성 전송
navigator.mediaDevices.getUserMedia({ audio: true })
    .then(function (stream) {
        // 서버로 오디오 스트림을 전달하기 위해 Socket.IO를 사용합니다.
        var socket = io.connect('http://localhost:5000'); // 서버 주소와 포트번호에 맞게 수정해주세요.

        // 오디오 스트림을 서버로 전송합니다.
        socket.emit('broadcast_audio', stream);
    })
    .catch(function (error) {
        console.error('오디오 스트림을 가져오는 중에 에러가 발생했습니다:', error);
    });

// 음소거 버튼 클릭 이벤트 처리
function toggleMute() {
    broSocket.emit('toggle_mute');
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

// 이미지 미리보기 함수
function previewImage() {
    var fileInput = document.getElementById('imageInput');
    var preview = document.getElementById('previewImage');

    var file = fileInput.files[0];
    var reader = new FileReader();

    reader.onloadend = function () {
        preview.src = reader.result;
    };

    if (file) {
        reader.readAsDataURL(file);
    } else {
        preview.src = "";
    }
}


// 이미지 업로드 함수
// 'imageUploadForm'이라는 id를 가진 엘리먼트에 'submit' 이벤트 리스너를 추가합니다.
document.getElementById('imageUploadForm').addEventListener('submit', function (e) {
    e.preventDefault(); // 폼의 기본 제출 동작을 막습니다.

    var imageFile = document.getElementById('imageInput').files[0]; // 'imageInput'이라는 id를 가진 input 엘리먼트에서 선택된 파일을 가져옵니다.
    var formData = new FormData(); // FormData 객체를 생성합니다.
    formData.append('image', imageFile); // FormData 객체에 선택된 파일을 추가합니다.

    // 이미지를 업로드합니다.
    fetch('/upload', {
        method: 'POST', // POST 방식으로 요청
        body: formData  // 요청 본문에는 formData를 추가. formData 안에는 업로드할 이미지 파일이 포함됩니다.
    })
        .then(response => response.json()) // 서버로부터 받은 응답을 JSON 형태로 변환합니다.
        .then(data => {
            // JSON 형태로 변환된 응답의 내용을 사용합니다. 
            console.log('받은 URL:', data.broadcastUrl); // 변환된 응답 중 'broadcastUrl'을 콘솔에 출력합니다.

            // 'imageElement'라는 id를 가진 HTML 요소의 src 속성에 URL을 할당합니다.
            // 이렇게 하면 해당 HTML 요소(이 경우 이미지 요소)에서 업로드한 이미지가 보여집니다.
            document.getElementById('imageElement').src = data.broadcastUrl;
        })
        .catch(error => {
            // 요청이나 응답 과정에서 오류가 발생하면 catch 블록이 실행됩니다.
            console.error(error); // 오류 내용을 콘솔에 출력합니다.
        });
});



// Socket.IO 이벤트 핸들러 (서버로부터 방송 정보를 받아와서 동적으로 표시)
broSocket.on('update_broadcast_info', function (data) {   // 현재 방송 정보를 업데이트
    var broadcastContent = document.querySelector('#broadcastInfo1 .titlename');
    var broadcastNickname = document.querySelector('#broadcastInfo1 .artist-name');

    broadcastContent.textContent = data.content;
    broadcastNickname.textContent = data.nickname;
});

// 음소거 상태에 따라 UI 업데이트
broSocket.on('update_mute_status', function (data) {
    var isMuted = data.isMuted;
    updateMuteUI(isMuted);
});

// 음소거 이미지 변경 함수
function updateMuteUI(isMuted) {
    var volumeIcon = document.querySelector('.volume img');

    // 음소거 상태에 따라 이미지 변경
    volumeIcon.src = isMuted ? 'static/unmute_icon.png' : 'static/mute_icon.png';
    volumeIcon.alt = isMuted ? '음소거 해제' : '음소거';
}

// 음소거 상태 토글 함수
function toggleMute() {
    var volumeIcon = document.querySelector('.volume img');

    // 현재 이미지의 alt 속성을 기반으로 음소거 여부를 판단
    var isMuted = volumeIcon.alt === '음소거';

    // 음소거 상태에 따라 이미지 변경
    volumeIcon.src = isMuted ? 'static/unmute_icon.png' : 'static/mute_icon.png';
    volumeIcon.alt = isMuted ? '음소거 해제' : '음소거';

    // 음소거 상태를 서버로 전송
    broSocket.emit('toggle_mute', { isMuted: !isMuted });
}




// 방송 정보 업데이트 이벤트 핸들러
broSocket.on('update_broadcast_data', function (data) {
    // 방송 정보 업데이트 코드 작성
    updateBroadcastInfo(data.content, data.nickname);
});


// 메시지 전송 기능
function sendMessage() {
    var nickInput = document.getElementById("nickInput");
    var chatInput = document.getElementById("chatInput");
    var chatContainer = document.getElementById("chatContainer");

    if (nickInput.value.trim() !== "" && chatInput.value.trim() !== "") {
        var message = document.createElement("p");
        message.textContent = nickInput.value + ": " + chatInput.value;

        var image = document.getElementById("previewImage");
        if (image.style.display !== "none") {
            var imageClone = image.cloneNode(true);
            message.appendChild(imageClone);
        }

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




// 방송 정보 업데이트 이벤트 핸들러
broSocket.on('update_broadcast_image', function (data) {
    // 이미지 업데이트 코드 (예: document.getElementById('previewImage').src = data.imagePath;)

    // 여기에서는 브로드캐스트된 이미지를 청취자 페이지의 이미지 엘리먼트에도 업데이트
    document.getElementById('listener_previewImage').src = data.imagePath;

    // 여기에서는 브로드캐스트된 이미지를 메인 페이지의 이미지 엘리먼트에도 업데이트
    document.getElementById('main_previewImage').src = data.imagePath;
});


// 방송 종료 버튼 클릭 시 팝업 표시
function endBroadcast() {
    showPopup();
}

// 팝업에서 "예" 버튼 클릭 시의 동작
function onPopupYes() {
    // 서버에 방송 종료 이벤트를 전달
    broSocket.emit('broadcast_end');

    // 팝업 닫기
    closePopup();

    // 메인 페이지로 이동
    window.location.href = "/";
}

// 팝업 표시 함수
function showPopup() {
    // 오버레이(어두운 배경) 생성
    var overlay = document.createElement("div");
    overlay.id = "popup-overlay";

    // 팝업창 생성
    var popup = document.createElement("div");
    popup.id = "popup";
    popup.innerHTML = `
      <div class="popup-container">
        <h2>방송을 종료하시겠습니까?</h2>
        <button class="yes">예</button>
        <button class="no">아니오</button>
      </div>
    `;

    // 오버레이와 팝업창을 문서에 추가
    document.body.appendChild(overlay);
    overlay.appendChild(popup);

    // "예" 버튼과 "아니오" 버튼에 이벤트 핸들러 할당
    popup.querySelector(".yes").onclick = onPopupYes;
    popup.querySelector(".no").onclick = closePopup;
}

// 팝업 닫기 함수
function closePopup() {
    // 오버레이 찾아서 제거
    var overlay = document.getElementById("popup-overlay");
    overlay.parentNode.removeChild(overlay);
}

// 닉네임과 방송 제목을 출력하는 코드
$(document).ready(function () {
    // Flask에서 전달한 데이터를 JavaScript로 가져오기
    var broadcastContent = "{{ broadcast.content }}";
    var broadcastNickname = "{{ broadcast.nickname }}";

    // 가져온 데이터를 화면에 출력
    $('#broadcastContent').text(broadcastContent);
    $('#broadcastNickname').text(broadcastNickname);
});