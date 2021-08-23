import secrets, os, time
from flask import render_template, url_for, flash, redirect, request, send_from_directory
from src.forms import RegistrationForm, LoginForm, UpdateAccount
from src.models import User
from src import app, db, bcrypt, result_base_dir_path, Sub_Categories, Sub_Product_Versions, Products, Categories, Product_Versions, config_dir
from flask_login import login_user, current_user, logout_user, login_required
from src.modules import list_dirs, file_validater, get_value, find_files
from src.apis import home_page_api, download_api, upload_api, replace_api


@app.route("/")
@app.route("/home")
def home():
    folder_list = list_dirs(result_base_dir_path)
    folder_list = [(folder, time.ctime(os.path.getmtime(os.path.join(result_base_dir_path, folder)))) for folder in folder_list]
    return render_template("home.html", title="File Server | Home", folder_list=folder_list if folder_list else [], dates=os.path.getmtime)

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
            if request.args.get('next'):
                if "home" in request.args.get('next'):
                    return redirect(url_for('file_and_folders', next_url=request.args.get('next').replace("/home", "") ))
                else:
                    return redirect(url_for('upload_file'))
            else:
                return redirect(url_for('home'))
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

@app.route("/home/<path:next_url>")
@login_required
def file_and_folders(next_url):
    path = os.path.join(result_base_dir_path, next_url)
    if os.path.isdir(path):
        folder_content = [(folder, time.ctime(os.path.getmtime(os.path.join(path, folder)))) for folder in os.listdir(path)]
        return render_template("folders.html", folder_content=folder_content, next_url=next_url, join=os.path.join)
    else:
        folder_path, file_path = "/".join(path.split("/")[:-1]), path.split('/')[-1]
        return send_from_directory(folder_path, file_path, as_attachment=True)

@app.route("/upload", methods=["GET", "POST"])
@login_required
def upload_file():
    if current_user.role:
        if request.method == "POST":
            product, sub_category, version, category, sub_prod = request.form['product'], request.form['sub_category'], request.form['version'], request.form['category'], request.form['sub_prod']
            file_name = request.files['file_to_upload'].filename
            if not file_name:
                flash(f'Select a File to Upload.', 'danger')
                return redirect(url_for('upload_file'))
            if file_validater(file_name):
                file_path = os.path.join(result_base_dir_path, get_value(product) , get_value(version), get_value(sub_prod), get_value(category), get_value(sub_category), file_name)
                if os.path.exists(os.path.join(result_base_dir_path, get_value(product) , get_value(version), get_value(sub_prod), get_value(category), get_value(sub_category))):
                    if os.path.exists(file_path):
                        flash(f'This file is allready on the server.', 'danger')
                    else:
                        request.files['file_to_upload'].save(file_path)
                        flash(f'File Uploaded successfully ', 'success')
                        return redirect(url_for('home'))
                else:
                    flash(f'Looks like you have selected wrong fields. Please try again.', 'danger')
            else:
                flash(f'Invalid file', 'danger')
                return redirect(url_for('upload_file'))
        return render_template("upload.html", title="File Server | Upload", Product_Versions=Product_Versions, config_dir=config_dir)
    else:
        return render_template("403.html", title="File Server | ERROR"), 403

@app.route("/replace", methods=["GET", "POST"])
@login_required
def replace_file():
    available_files = []
    if current_user.role:
        if request.method == "POST":
            try:
                file_to_replace = request.form['file_to_replace']
                if not file_to_replace:
                    flash(f'Enter file name needs to be replaced.', 'danger')
                    return render_template("replace.html", title="File Server | Replace File", ask_for_file=True)
                available_files = find_files(file_to_replace, result_base_dir_path)
            except KeyError :
                file_name = request.files.get('file_to_upload').filename
                if not file_name:
                    flash(f'Select a File to Upload.', 'danger')
                    return render_template("replace.html", title="File Server | Replace File", ask_for_file=True)
                if file_validater(file_name):
                    file_path = os.path.join(result_base_dir_path, request.form['available_file'])
                    os.remove(file_path)
                    file_path = "/".join(file_path.split("/")[:-1])
                    file_path = os.path.join(file_path, file_name)
                    request.files['file_to_upload'].save(file_path)
                    flash(f'File Replaced successfully.', 'success')
                else:
                    flash("Invalid File please select Valid File.", 'danger')
                    return render_template("replace.html", title="File Server | Replace File", ask_for_file=True)
            if available_files:
                flash(f'File Found Select The File You Want To Replace.', 'success')
                return render_template("replace.html", title="File Server | Replace File", available_files=available_files)
            else:
                flash("File Not Found, Please check the file name and try again.", "danger")
                return render_template("replace.html", title="File Server | Replace File", ask_for_file=True)
        else:
            return render_template("replace.html", title="File Server | Replace File", ask_for_file=True)

@app.errorhandler(404)
def error_404(error):
    return render_template("404.html", title="File Server | ERROR"), 404

@app.errorhandler(403)
def error_403(error):
    return render_template("403.html", title="File Server | ERROR"), 403

@app.errorhandler(500)
def error_500(error):
    return render_template("500.html", title="File Server | ERROR"), 500

@app.route("/api")
def home_api():
    return home_page_api()

@app.route("/api/upload", methods=["GET","POST"])
def upload_file_api():
    return upload_api(request)

@app.route("/api/download")
def download_file_api():
    return download_api(request)

@app.route("/api/replace")
def replace_file_api():
    return replace_api(request)
