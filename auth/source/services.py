from datetime import datetime
from sqlalchemy.exc import IntegrityError
from .models import User
from flask_login import login_user
from datetime import datetime
from flask import request
from .app import db
from flask_login import current_user

# Function to authenticate user
def authenticate_user(usernamex, password):

    user = User.query.filter_by(username=usernamex).first()
    if  not user:
        return 'User does not exist.', False 
    if  not user.verify_password(password):
        return 'Invalid credentials.', False 
    login_user(user) #creates current_user
    return user, True

#Function to create a new user
def create_user(google_id, first_name, last_name,username,email,image,OAuthx):
    if image is None:
        image = '../../static/images/user-default.png'
    #insert user into the database
    new_user = User(
        google_id=google_id,
        first_name=first_name,
        last_name=last_name,
        username=username,
        email=email,
        profile_image= image,  # Default profile image
        last_login= datetime.utcnow()
    )
    OAuth = OAuthx
    if not OAuth:
        # Then set the password (this will trigger the hashing)
        new_user.password = request.form.get('password')  # This uses @password.setter method
    else:
        pass

    try:
        db.session.add(new_user)
        db.session.commit()
        return True, None
    except IntegrityError:
        db.session.rollback()
        return False, 'Username or email already exists.'