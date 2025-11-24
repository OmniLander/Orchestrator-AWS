
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager  # <-- ADD THIS IMPORT
# Change this import
from .config import get_config # <-- IMPORT THE FUNCTION

#this file is the Application Factory Pattern

db = SQLAlchemy()

def create_app():
    app = Flask(__name__,
                template_folder='templates',
                static_folder='static')
    
    # Use the function to get the correct config object
    app.config.from_object(get_config()) # <-- USE THE FUNCTION HERE
    
    db.init_app(app)

    from .models import User  # Import User model for authentication

    # Import and register models within app context
    with app.app_context():
        db.create_all()

    # Initialize Flask-Login
    login_manager = LoginManager()
    login_manager.init_app(app)  # This connects it to your Flask app

    # You'll also need a user_loader callback
    @login_manager.user_loader
    def load_user(id):
        # Your code to load a user from the user_id
        return User.query.get(int(id))  # Example - replace with your actual user loading


    # Register blueprints/controllers
    from .routes import main
    app.register_blueprint(main)

    return app