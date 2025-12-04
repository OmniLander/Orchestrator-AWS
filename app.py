# app.py
from flask import Flask, render_template, jsonify
from Modules import networking, security, compute, state

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html', estado=state.ESTADO)

@app.route('/deploy/networking', methods=['POST'])
def deploy_networking():
    try:
        result = networking.desplegar_red()
        return jsonify(result)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/deploy/security', methods=['POST'])
def deploy_security():
    try:
        result = security.desplegar_seguridad()
        return jsonify(result)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/deploy/web', methods=['POST'])
def deploy_web():
    try:
        result = compute.lanzar_web()
        return jsonify(result)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/deploy/oficina', methods=['POST'])
def deploy_oficina():
    try:
        result = compute.lanzar_oficina()
        return jsonify(result)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/status', methods=['GET'])
def get_status():
    return jsonify(state.ESTADO)

if __name__ == '__main__':
    app.run(debug = False, host = '0.0.0.0', port = 5010)
