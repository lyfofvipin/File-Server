import secrets, os
from flask import render_template, url_for, flash, redirect, request
from src.forms import RegistrationForm, LoginForm, UpdateAccount
from src.models import User
from src import app, db, bcrypt
from flask_login import login_user, current_user, logout_user, login_required


@app.route("/")
@app.route("/home")
def home():
    return render_template("home.html", title="File Server | Home")

@app.route("/about")
def about():
    return render_template("about.html", title="File Server | About")
    
@app.route("/register", methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('home'))
    form = RegistrationForm()
    if form.validate_on_submit():
        hashed_password = bcrypt.generate_password_hash(form.password.data).decode('utf-8')
        user = User(username = form.username.data, email = form.email.data, password = hashed_password, role=form.role.data)
        db.session.add(user)
        db.session.commit()
        flash(f'Account created for {form.username.data}! you are now able to login.', 'success')
        return redirect(url_for('login'))
    return render_template("register.html", title="File Server | REGISTER", form = form)

@app.route("/login", methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('home'))
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user and bcrypt.check_password_hash(user.password, form.password.data):
            login_user(user, remember=form.remember.data)
            next_page = request.args.get('next')[1:] if request.args.get('next') else 'home'
            return redirect(url_for(next_page))
        else:
            flash("Login Unsuccessfull, Please check Username or Password", "danger")
    return render_template("login.html", title="File Server | LOGIN", form = form)

@app.route("/logout")
def logout():
    logout_user()
    return redirect(url_for('home'))

def save_pic(picture):
    random_hex = secrets.token_hex(8)
    _, file_extension = os.path.splitext(picture.filename)
    picture_name = random_hex + file_extension
    picture_path = os.path.join(app.root_path, 'static/profile_pic', picture_name)
    picture.save(picture_path)
    return picture_name

@app.route("/account", methods=['GET', 'POST'])
@login_required
def account():
    form = UpdateAccount()
    if form.validate_on_submit():
        if form.picture.data:
            picture_file = save_pic(form.picture.data)
            current_user.image = picture_file
        current_user.username = form.username.data
        current_user.email = form.email.data
        db.session.commit()
        flash('Account updated Successfully.', 'success')
        return redirect(url_for('account'))
    elif request.method == 'GET':
        form.username.data = current_user.username
        form.email.data = current_user.email
    image_file = url_for('static', filename='profile_pic/' + current_user.image)
    return render_template("account.html", title="File Server | ACCOUNT", image_file=image_file, form=form)

@app.errorhandler(404)
def error_404(error):
    return render_template("404.html", title="File Server | ERROR"), 404

@app.errorhandler(403)
def error_403(error):
    return render_template("403.html", title="File Server | ERROR"), 403

@app.errorhandler(500)
def error_500(error):
    return render_template("500.html", title="File Server | ERROR"), 500