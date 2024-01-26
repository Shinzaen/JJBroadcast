# app.py

from flask import Flask, render_template, request, jsonify, redirect, url_for, session, send_from_directory
from flask_socketio import SocketIO, emit
import os
import threading
from google.cloud import speech_v1p1beta1 as speech
from pydub import AudioSegment
from pydub.playback import play
import numpy as np
import io
import speech_recognition as sr
from dotenv import load_dotenv
import uuid
from flask_cors import CORS
import random
import string
from werkzeug.utils import secure_filename

def generate_random_broadcast_id(length=8):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

# .env 파일을 현재 환경 변수로 로드
load_dotenv(verbose=True)

app = Flask(__name__, static_url_path='/static', static_folder='C:/Users/SBA/recproject/static')
app.secret_key = '2AZSMss3p5QPbcY2hBsJ'
socketio = SocketIO(app, cors_allowed_origins="*")
CORS(app, resources={r"/": {"origins": "http://localhost:5000"}})  # CORS 활성화


# 방송 정보를 저장할 딕셔너리
broadcasts = {}
# 방송 목록을 저장할 변수
broadcast_list = []


# url처리 리스너가 목록박스를 누르면 방송으로 들어올 수 있게

def start_broadcast_common():
    # 세션에 'uuid' 설정
    session['uuid'] = str(uuid.uuid4()) 

    # 클라이언트로부터 전달된 데이터를 이용하여 방송 정보 업데이트
    nickname = request.json.get('nickname')
    broadcast_content = request.json.get('content')

    # 고유한 ID 생성
    broadcast_id = str(uuid.uuid4())

    # # 이미지를 업로드하고 URL 생성
    # if 'image' not in request.files:
    #     return jsonify({'error': 'No image part'})

    # image_file = request.files['image']

    # if image_file.filename == '':
    #     return jsonify({'error': 'No selected image file'})

    # filename = secure_filename(image_file.filename)
    # image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    # image_file.save(image_path)
    
    # # 이미지 URL 생성
    # image_url = url_for('uploaded_file', filename=filename, _external=True)
    image_url = None  # 이미지가 필요 없는 경우에는 image_url을 None으로 설정합니다.


    # 동적으로 생성된 URL
    broadcast_url = url_for('broadcast_page', broadcast_id=broadcast_id, _external=True)

    # 클라이언트에게 방송 정보를 전달
    broadcast_data = {
        'id': broadcast_id,
        'url': broadcast_url,
        'content': broadcast_content,
        'nickname': nickname,
        'imagePath': image_url,  # 이미지 URL 추가
        'is_active': True
    }

    # broadcasts 딕셔너리에 방송 정보 추가
    broadcasts[broadcast_id] = broadcast_data

    print(f"Broadcast started: {broadcast_id} - {nickname}")

    # 모든 클라이언트에게 방송 시작 이벤트 브로드캐스트
    socketio.emit('broadcast_started', broadcast_data, namespace='/listener', room=session['uuid'])
    socketio.emit('broadcast_started', broadcast_data, namespace='/broadcast', room=session['uuid'])

    # 클라이언트로 방송 제목과 닉네임 전달
    socketio.emit('update_broadcast_info', {'content': broadcast_content, 'nickname': nickname}, namespace='/listener', room=session['uuid'])
    socketio.emit('update_broadcast_info', {'content': broadcast_content, 'nickname': nickname}, namespace='/broadcast', room=session['uuid'])

    # 클라이언트에게 생성된 URL을 반환
    return jsonify({'broadcastUrl': broadcast_url, 'imagePath': image_url})

@app.route('/start_broadcast', methods=['POST', 'GET'])
def start_broadcast():
    if request.method == 'POST':
        return start_broadcast_common()
    # 'GET' 요청의 경우에는 리디렉션 없이 아무 동작도 하지 않습니다.
    return jsonify({'message': 'Nothing to do for GET requests.'})



# 방송 시작 시
@socketio.on('start_broadcast')
def handle_start_broadcast(data):
    nickname = data['nickname']
    broadcast_content = data['broadcastContent']

    # 방송 ID 생성 (여기서는 임의로 생성)
    broadcast_id = generate_random_broadcast_id()

    # 클라이언트에게 방송 정보 전달
    emit('broadcast_info', {'id': broadcast_id, 'content': broadcast_content, 'nickname': nickname}, broadcast=True)


@app.route('/broadcast/<broadcast_id>')
def listen_broadcast(broadcast_id):
    """
    라우트 '/broadcast/<broadcast_id>'에 대한 핸들러 함수.
    
    :param broadcast_id: 방송의 고유 ID 또는 식별자
    :return: 'listen_broadcast.html' 템플릿을 렌더링한 결과
    """
    return render_template('listen_broadcast.html', broadcast_id=broadcast_id)


# 메인화면으로 향하게
@app.route('/main.html')
def main():
    return render_template('main.html')

# templates 폴더에 위치한 broadcast.html을 찾을 수 있도록 라우팅 추가
@app.route('/broadcast.html')
def broadcast_page():
    broadcast_data = {'content': '제 목', 'nickname': '닉네임'}
    return render_template('broadcast.html', broadcast=broadcast_data)

# static/audio 폴더에 저장
app.config['AUDIO_UPLOAD_FOLDER'] = "static/audio"

#파일 이름에 대한 보안을 위해 secure_filename() 함수를 사용, convert_and_save_audio(file) 함수는 업로드된 오디오 파일의 저장 경로를 반환하므로, 이 경로는 /upload_audio 라우트에서 사용
def convert_and_save_audio(file):
    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['AUDIO_UPLOAD_FOLDER'], filename)
    file.save(file_path)
    return file_path

# 오디오 파일 업로드 처리 라우트
@app.route('/upload_audio', methods=['POST'])
def upload_audio_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'})

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No selected file'})

    if file:
        wav_file_path = convert_and_save_audio(file)
        return jsonify({'file_path': wav_file_path, 'broadcastId': None})  # 'broadcastId'를 반환하지 않음

# 이미지 저장 디렉토리 설정
app.config['UPLOAD_FOLDER'] = "static/images"

# 이미지 파일 업로드 처리 라우트
@app.route('/upload_image', methods=['POST'])
def upload_image_file():
    if 'image' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['image']

    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # 파일 저장 후 URL 반환
        image_url = url_for('uploaded_file', filename=filename, _external=True)
        return jsonify({'broadcastUrl': image_url}), 200

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)




# 파일 변환
def convert_and_save_audio(file):
    unique_filename = str(uuid.uuid4())
    wav_file_path = os.path.join(app.config['AUDIO_UPLOAD_FOLDER'], unique_filename + '.wav')  # 수정된 부분

    # 파일을 WAV 형식으로 변환하고 저장
    audio = AudioSegment.from_file(file)
    audio.export(wav_file_path, format="wav")

    return wav_file_path

# 삐소리 생성 함수
def create_beep(duration):
    sps = 44100
    freq_hz = 1000.0
    vol = 0.5

    esm = np.arange(duration / 1000 * sps)
    wf = np.sin(2 * np.pi * esm * freq_hz / sps)
    wf_quiet = wf * vol
    wf_int = np.int16(wf_quiet * 32767)

    beep = AudioSegment(
        wf_int.tobytes(),
        frame_rate=sps,
        sample_width=wf_int.dtype.itemsize,
        channels=1
    )

    return beep

# 욕설 감지 및 삐처리 함수
def detect_and_play_beep(socketio, text, profanity_list):
    if any(profanity in text for profanity in profanity_list):
        print("욕설이 감지되었습니다. 삐 소리를 재생합니다.")
        beep_duration = len(text.split()) * 200  # 단어의 길이에 따라 삐 소리의 길이 동적 조절
        beep = create_beep(duration=beep_duration)
        play(beep)
        socketio.emit('beep_audio', {'audio_data': beep.raw_data})  # 클라이언트에게 삐처리된 소리 전송

# 마이크에서 실시간으로 음성을 감지하고 처리하는 함수
def profanity_beep_listener(socketio, profanity_list):
    recognizer = sr.Recognizer()

    with sr.Microphone() as source:
        print("방송 중... 욕설이 나오면 삐 소리가 재생됩니다.")
        while True:
            try:
                audio = recognizer.listen(source, timeout=None)
                content = audio.frame_data

                beep = create_beep(duration=len(content))

                client = speech.SpeechClient()
                config = {
                    "language_code": ["ko-KR", "en-US"],
                    "sample_rate_hertz": 44100,
                    "encoding": speech.RecognitionConfig.AudioEncoding.LINEAR16,
                    "audio_channel_count": 2,
                    "enable_word_time_offsets": True,
                    "use_enhanced": True,
                }

                audio = speech.RecognitionAudio(content=content)
                response = client.recognize(config=config, audio=audio)

                for result in response.results:
                    alternative = result.alternatives[0]
                    print(u"전사본: {}".format(alternative.transcript))

                    detect_and_play_beep(socketio, alternative.transcript, profanity_list)

            except sr.UnknownValueError:
                pass
            except sr.RequestError as e:
                print(f"음성인식 서비스에 오류가 있습니다: {e}")
            except Exception as e:
                print(f"에러가 발생했습니다: {e}")

# Flask 애플리케이션 라우트
@app.route('/')
def index():
    broadcasts = [{'nickname': '', 'content': '', 'imagePath': ''} for _ in range(8)]  # 8개의 빈 데이터 생성
    return render_template('main.html', broadcasts=broadcasts)

# Socket.IO 이벤트 핸들러
@socketio.on('start_listening', namespace='/listener')
def start_listening_event():
    profanity_list = os.environ.get("PROFANITY_LIST").split(',')
    print("start_listening_event triggered")
    threading.Thread(target=profanity_beep_listener, args=(socketio, profanity_list)).start()

# 방송 송출자 서버의 start_broadcast 이벤트 핸들러
@socketio.on('start_broadcast', namespace='/broadcast')
def start_broadcast(data):
    """
    방송 송출자가 방송을 시작할 때 호출되는 Socket.IO 이벤트 핸들러.

    :param data: 클라이언트로부터 전송된 데이터
    """
    broadcast_id = data['broadcastId']
    broadcast_data = {
        'id': broadcast_id,
        'nickname': data['nickname'],
        'content': data['content'],
        'imagePath': data['imagePath'],
        'is_active': True
    }
    broadcasts[broadcast_id] = broadcast_data

    print(f"Broadcast started: {broadcast_id} - {data['nickname']}")

    # 모든 클라이언트에게 방송 시작 이벤트 브로드캐스트
    socketio.emit('broadcast_started', broadcast_data, namespace='/listener', broadcast=True)
    socketio.emit('broadcast_started', broadcast_data, namespace='/broadcast', broadcast=True)

    # 클라이언트로 방송 제목과 닉네임 전달
    socketio.emit('update_broadcast_info', {'content': data['content'], 'nickname': data['nickname']}, namespace='/listener', broadcast=True)
    socketio.emit('update_broadcast_info', {'content': data['content'], 'nickname': data['nickname']}, namespace='/broadcast', broadcast=True)


# 리스너 클라이언트의 start_broadcast 이벤트 핸들러
@socketio.on('start_broadcast')
def handle_start_broadcast(data):
    """
    리스너 클라이언트가 방송을 시작할 때 호출되는 Socket.IO 이벤트 핸들러.

    :param data: 클라이언트로부터 전송된 데이터
    """
    nickname = data.get('nickname')
    content = data.get('content')
    broadcast_url = f'/broadcast/{len(broadcast_list) + 1}'

    # 방송 정보를 방송 목록에 추가
    broadcast_list.append({'nickname': nickname, 'content': content, 'url': broadcast_url})

    # 송출자에게 URL 전달
    emit('broadcast_url', {'url': broadcast_url}, broadcast=True)

    # 방송 목록 업데이트
    update_broadcast_list()


# Socket.IO 이벤트 핸들러: 클라이언트에서 방송 목록을 요청할 때 호출
@socketio.on('get_broadcast_list')
def get_broadcast_list():
    """
    클라이언트가 방송 목록을 요청할 때 호출되는 Socket.IO 이벤트 핸들러.
    현재 방송 목록을 해당 클라이언트에게 전송한다.
    """
    emit('update_broadcast_list', {'broadcast_list': broadcast_list})

# 방송 목록 업데이트 함수
def update_broadcast_list():
    """
    방송 목록을 업데이트하고, 해당 변경사항을 모든 클라이언트에게 브로드캐스트하는 함수.
    """
    # 방송 목록 업데이트 이벤트 전송
    emit('update_broadcast_list', {'broadcast_list': broadcast_list}, broadcast=True)


# 방송 송출자 서버의 stop_broadcast 이벤트 핸들러
@socketio.on('stop_broadcast', namespace='/broadcast')
def stop_broadcast(data):
    # 클라이언트로부터 전달된 데이터를 이용하여 방송 정보 업데이트
    broadcast_id = data['id']

    if broadcasts.get(broadcast_id):
        broadcasts[broadcast_id]['is_active'] = False
        print(f"Broadcast stopped: {broadcast_id}")

        # 모든 클라이언트에게 방송 종료 이벤트 브로드캐스트
        socketio.emit('broadcast_stopped', data, namespace='/listener', broadcast=True)
        socketio.emit('broadcast_stopped', data, namespace='/broadcast', broadcast=True)


# 팝업에서 전송된 닉네임과 방송 제목을 저장할 변수들
popup_nickname = ""
popup_title = ""

# /get_nickname_and_title 엔드포인트 추가
@app.route('/get_nickname_and_title', methods=['GET'])
def get_nickname_and_title():
    # 팝업에서 전송된 닉네임과 방송 제목을 반환
    return jsonify({'nickname': popup_nickname, 'title': popup_title})


# 팝업에서 전송된 정보를 받아 저장하는 엔드포인트 추가
@app.route('/save_popup_info', methods=['POST'])
def save_popup_info():
    global popup_nickname, popup_title
    data = request.get_json()
    popup_nickname = data.get('nickname', '')
    popup_title = data.get('title', '')
    return jsonify({'success': True})



# 방송 송출자의 broadcast 이벤트 핸들러
@socketio.on('broadcast_audio', namespace='/broadcast')
def broadcast_audio(data):
    broadcast_id = data['broadcastId']
    audio_data = data['audioData']

    # 방송 송출자의 audio_data를 받아 처리하는 로직을 추가
    # 예: 서버에서 리스너에게 전달
    socketio.emit('listener_receive_audio', {'broadcastId': broadcast_id, 'audioData': audio_data}, namespace='/listener', broadcast=True)

# 리스너의 listener_receive_audio 이벤트 핸들러
@socketio.on('listener_receive_audio', namespace='/listener')
def listener_receive_audio(data):
    broadcast_id = data['broadcastId']
    audio_data = data['audioData']

    # 리스너의 audio_data를 받아 처리하는 로직을 추가
    # 예: 리스너에게 음성 데이터를 전달
    socketio.emit('play_audio', {'broadcastId': broadcast_id, 'audioData': audio_data}, namespace='/listener', broadcast=True)



# 방송 송출자 서버의 chat_message 이벤트 핸들러
@socketio.on('chat_message', namespace='/broadcast')
def chat_message(data):
    # 받은 채팅 메시지를 모든 사용자에게 브로드캐스트
    socketio.emit('chat_message', data, namespace='/listener', broadcast=True)
    socketio.emit('chat_message', data, namespace='/broadcast', broadcast=True)

# 방송 종료 처리
@app.route("/broadcast/end")
def broadcast_end():
    # 메인 화면으로 이동
    return redirect("/")


# 서버 실행
if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)  # 서버를 5000번 포트에서 실행
