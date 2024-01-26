// main.js

// Socket.IO 클라이언트 소켓 생성
var mySocket = io.connect('ws://' + document.domain.replace(/-/g, ':') + ':' + location.port);

// 연결되었을 때 수행할 작업
mySocket.on('connect', function () {
    console.log("Socket connected");
});

// 방송 정보 업데이트 이벤트 핸들러
mySocket.on('update_broadcast_info', function (data) {
    // 방송 정보 업데이트 함수 호출
    updateBroadcastInfo(data.content, data.nickname);
});

// 팝업 보이기
function showPopup() {
    document.getElementById("popup").style.display = "block";
}



// 방송을 시작하는 함수
function startBroadcast(nickname, title) {
    // 이 함수는 서버에 방송 시작을 요청하고, 방송 URL을 반환하는 Promise를 반환합니다.
    return new Promise((resolve, reject) => {
        // AJAX 요청을 통해 서버에 방송 시작 정보를 보냅니다.
        $.ajax({
            type: "POST",
            url: "/start_broadcast",
            contentType: "application/json",
            data: JSON.stringify({ "nickname": nickname, "title": title }),
            success: function (response) {
                // 서버로부터 방송 URL을 받으면, 이를 resolve 함수를 통해 반환합니다.
                if (response.broadcastUrl) {
                    resolve(response.broadcastUrl);
                } else {
                    reject(new Error("방송 URL을 받지 못했습니다."));
                }
            },
            error: function (error) {
                // 요청에 실패하면, 오류를 reject 함수를 통해 반환합니다.
                reject(error);
            }
        });
    });
}


// 팝업에서 방송 시작 버튼 클릭 시의 동작
function startBroadcastFromPopup() {
    // 입력된 닉네임과 방송 제목 가져오기
    var nickname = document.getElementById("nicknameInput").value.trim();
    var title = document.getElementById("broadcastContentInput").value.trim();

    // 닉네임과 제목이 모두 입력되었는지 확인
    if (nickname !== "" && title !== "") {
        // 이미지 업로드는 여기에서 수행하지 않고, 서버로 이미지 정보를 보내기만 합니다.
        // 이미지를 업로드하는 로직은 방송 송출자 페이지에서 수행될 것입니다.

        // 서버에 닉네임과 제목 정보 전송
        $.ajax({
            type: "POST",
            url: "/save_popup_info",
            contentType: "application/json",
            data: JSON.stringify({ "nickname": nickname, "title": title }),
            success: function (response) {
                console.log(response);

                // 여기서 서버로 방송 시작 요청을 보내도 됩니다.
                // 예: startBroadcast 함수 호출
                startBroadcast(nickname, title)
                    .then(function (broadcastUrl) {
                        // 받아온 URL을 이용하여 필요한 작업을 수행
                        console.log('방송을 시작합니다. URL:', broadcastUrl);

                        // 팝업 숨기기
                        document.getElementById("popup").style.display = "none";

                        // 페이지 전환
                        window.location.href = "broadcast.html";
                    })
                    .catch(function (error) {
                        console.error('방송 시작 중 오류 발생:', error);
                    });
            },
            error: function (error) {
                console.error("팝업 정보를 서버에 저장하는 동안 오류 발생:", error);
            }
        });
    } else {
        alert("닉네임과 방송 제목을 모두 입력해주세요.");
    }
}

// 팝업 닫기
function closeBroadcastFromPopup() {
    // 예를 들어, 팝업을 담고 있는 div의 id가 'popup'이면:
    var popup = document.getElementById('popup');
    if (popup) {
        popup.style.display = 'none'; // 팝업을 숨깁니다.
    }
}



// 서버로부터 닉네임과 제목을 가져와서 화면에 표시하는 함수
function fetchNicknameAndTitle() {
    fetch('/get_nickname_and_title')
        .then(response => response.json())
        .then(data => {
            // broadcastUrlElement 업데이트
            var broadcastUrlElement = document.getElementById('broadcastUrlElement');
            if (broadcastUrlElement) {
                broadcastUrlElement.textContent = `닉네임: ${data.nickname}, 제목: ${data.title}`;
            } else {
                console.error('Element with id "broadcastUrlElement" not found.');
            }
        })
        .catch(error => console.error('Error:', error));
}


// Socket.IO 이벤트 핸들러 (서버로부터 방송 목록을 받아와서 동적으로 생성)
mySocket.on('update_broadcast_list', function (data) {
    var body = document.getElementById("body");
    body.innerHTML = ""; // 기존 목록 비우기

    // 서버로부터 받아온 목록으로 네모칸들을 동적으로 생성
    var broadcastList = data.broadcast_list.map(function (broadcast) {
        var cell = document.createElement("div");
        cell.className = "cell";
        cell.textContent = broadcast.nickname;

        // 이미지가 있는 경우 이미지를 추가
        if (broadcast.imagePath) {
            var image = document.createElement("img");
            image.className = "broadcast-image";
            image.src = broadcast.imagePath;
            image.alt = "Broadcast Image";
            cell.appendChild(image);
        }

        return cell;
    });

    body.appendChild(...broadcastList);
});

// 방송 정보 업데이트 이벤트 핸들러
mySocket.on('update_broadcast_data', function (data) {
    // 방송 정보 업데이트 코드 작성
    updateBroadcastInfo(data.content, data.nickname);
});

// 방송 정보 업데이트 함수
function updateBroadcastInfo(content, nickname) {
    // 방송 정보를 표시하는 엘리먼트에 접근
    var titleElements = document.querySelectorAll('#broadcastInfo1 .titlename');
    var artistElements = document.querySelectorAll('#broadcastInfo1 .artist-name');

    // 엘리먼트가 존재하는지 확인 후 각 엘리먼트의 내용을 업데이트
    titleElements.forEach(function (titleElement) {
        if (titleElement) {
            titleElement.textContent = content;
        }
    });

    artistElements.forEach(function (artistElement) {
        if (artistElement) {
            artistElement.textContent = nickname;
        }
    });
}


// 팝업에서 전송된 정보를 서버로 전송 제목과 닉네임을 서버 저장변수로 보내는 함수
function sendPopupInfoToServer() {
    var nickname = document.getElementById('nicknameInput').value;
    var title = document.getElementById('broadcastContentInput').value;

    fetch('/save_popup_info', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            nickname: nickname,
            title: title,
        }),
    })
        .then(response => response.json())
        .then(data => {
            console.log('Popup info sent to server:', data);
        })
        .catch(error => console.error('Error sending popup info to server:', error));
}



// 방송 시작 버튼 클릭 이벤트 처리
document.getElementById('startBroadcastButton').addEventListener('click', function () {
    var nickname = document.getElementById('nicknameInput').value;
    var broadcastContent = document.getElementById('broadcastContentInput').value;

    // 서버로 방송 시작 데이터 전송
    mySocket.emit('start_broadcast', {
        nickname: nickname,
        content: broadcastContent,
        // 추가적으로 필요한 데이터도 여기에 포함
    });

    // 서버로부터 고유한 URL을 받아오는 AJAX 요청
    fetch('/start_broadcast', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            nickname: nickname,
            content: broadcastContent
        })
    })
        .then(function (response) {
            // 응답이 비어 있는지 확인
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            return response.json();
        })
        .then(function (data) {
            // 받아온 URL을 이용하여 필요한 작업을 수행
            console.log('서버로부터 받은 데이터:', data);  // 새로 추가된 부분

            if (data && data.broadcastUrl) {
                console.log('방송을 시작합니다. URL:', data.broadcastUrl);
                // 페이지 내에 URL을 표시하는 엘리먼트에 URL을 할당
                document.getElementById('broadcastUrlElement').textContent = data.broadcastUrl;

                // 서버로 Socket.IO 이벤트를 통해 방송 시작 데이터 전송
                broSocket.emit('start_broadcast', {
                    broadcastId: data.broadcastId,
                    nickname: nickname,
                    content: broadcastContent,
                    // 추가적으로 필요한 데이터도 여기에 포함
                });
            } else {
                console.error('Received unexpected data from the server.');
            }
        })
        .catch(function (error) {
            console.error('Error:', error);
        });
});



// 새로고침 함수
function refreshPage() {
    window.location.href = "/"; // 또는 필요한 새로고침 로직을 추가
}
