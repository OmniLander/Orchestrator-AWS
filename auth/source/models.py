from sqlalchemy import Column, Integer, String
from .app import db
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin

class User(UserMixin, db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)  # Match DB column name
    google_id = db.Column(db.String(100), unique=True, nullable=True)
    username = db.Column(db.String(50))
    email = db.Column(db.String(80))  # Matches DB

    password_hash = db.Column(db.String(255) ,nullable=True)  # Matches DB
    #password_salt = db.Column(db.Text, nullable=True)  future use for password hashing

    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    profile_image = db.Column(db.String(100))
    last_login = db.Column(db.Date)  # Matches DB

    @property
    def password(self):
        raise AttributeError('password is not a readable attribute')
    
    # Setter method that hashes the password
    @password.setter
    def password(self, password):
        self.password_hash = generate_password_hash(password)
    
    # Method to verify the password
    def verify_password(self, password):
        return check_password_hash(self.password_hash, password)