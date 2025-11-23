from flask import Flask, redirect, url_for, Blueprint, jsonify
from Modules.VPC_MS.VPC_controllers.VPC_controller import VPC_controller_bp
from dotenv import load_dotenv
from pathlib import Path
import os

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

if not os.getenv("secret_key"):
    print("No .env file or secret_key in file :C")

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY")
app.register_blueprint(VPC_controller_bp)

@app.route('/')
def vpcs():
    return redirect(url_for('VPC_controller_bp.vpc_dashboard'))

if __name__ == '__main__':
    print(app.url_map)
    print("Registered blueprints:", app.blueprints.keys())
    app.run(debug = True, host = '0.0.0.0', port = 5004)