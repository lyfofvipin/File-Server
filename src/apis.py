import os
from flask import jsonify, request, send_from_directory, make_response
from src import app, db, result_base_dir_path, bcrypt
from src.modules import (
    list_dirs,
    file_validater,
    find_files,
    set_the_description,
    get_the_description,
    if_none_then_empty_str,
    normalize_relative_path,
    ensure_dir_under_base,
    resolve_safe_dir_path,
)
from src.models import User

def api_data_validator(request):
    auth = request.authorization

    if not auth or not auth.username or not auth.password:
        return 'Login fail please pass the correct credentials.'
    user = User.query.filter_by(username=auth.username).first()
    try:
        user.password
    except:
        return 'User not Found.'
    if bcrypt.check_password_hash(user.password, auth.password) and user:
        return "Auth Verified.", user.role
    else:
        return "Invalid credentials."

def home_page_api():
    folder_list = list_dirs(result_base_dir_path)
    return jsonify({ "products": [ product for product in folder_list]})

def download_api(request):
    api_data_check = api_data_validator(request)
    if "Auth Verified." in api_data_check:
        rel_path = normalize_relative_path(request.args.get('path', ''))
        if rel_path is None:
            return jsonify({'message': 'Invalid path.'}), 404
        file_name = request.args.get('file')
        dir_path = resolve_safe_dir_path(result_base_dir_path, rel_path)
        if not dir_path or not os.path.isdir(dir_path):
            return jsonify({'message': 'Directory not found.'}), 404
        if not file_name:
            files = [x for x in os.listdir(dir_path) if x != "site.db" and not x.startswith(".")]
            files = {x: y for x, y in zip(files, get_the_description(dir_path, files, called_from="api"))}
            return jsonify({"available_files": files})
        file_path = os.path.join(dir_path, os.path.basename(file_name))
        if os.path.isfile(file_path):
            return send_from_directory(dir_path, os.path.basename(file_name), as_attachment=True)
        return jsonify({'message': 'File not found.'}), 404
    return make_response(api_data_check, 401, {'WWW-Authenticate' : 'Basic realm="Login required!"'})

def upload_api(request):
    api_data_check = api_data_validator(request)
    if "Auth Verified." in api_data_check:
        if api_data_check[-1]:
            rel_path = normalize_relative_path(request.args.get('path', ''))
            if rel_path is None:
                return jsonify({'message': 'Invalid path.'}), 404
            comment = request.args.get('comment', '')
            need_url = request.args.get('need_url')
            dest_dir = ensure_dir_under_base(result_base_dir_path, rel_path)
            if not dest_dir:
                return jsonify({'message': 'Upload path must stay inside the file server root.'}), 404
            if 'file' not in request.files:
                return jsonify({'message' : 'No file part in the request'}), 404
            file = request.files['file']
            if file.filename == '':
                return jsonify({'message': 'No file selected for uploading'}), 404
            file_name = os.path.basename(file.filename.replace("\\", "/"))
            if not file_validater(file_name):
                return jsonify({'message': 'Invalid file'}), 404
            dest_file = os.path.join(dest_dir, file_name)
            if os.path.exists(dest_file):
                return jsonify({'message' : 'This file is already on the server.'})
            set_the_description(dest_file, file_name, comment or "")
            file.save(dest_file)
            if need_url:
                url_path = "/home/" + "/".join(filter(None, [if_none_then_empty_str(rel_path), file_name]))
                return url_path
            return jsonify({'message' : 'File Uploaded successfully'})
        else:
            return jsonify({"message": "You don't have permission to access this API."})
    return make_response(api_data_check, 401, {'WWW-Authenticate' : 'Basic realm="Login required!"'})

def replace_api(request):
    file_index = 0
    api_data_check = api_data_validator(request)
    if "Auth Verified." in api_data_check:
        if api_data_check[-1]:
            try:
                file_to_replace, new_file , file_number, comment = request.args["file_to_replace"], request.files['file'], request.args.get("file_number"), request.args.get("comment")
                file_name = new_file.filename
                available_files = find_files(file_to_replace, result_base_dir_path)
            except KeyError :
                return jsonify({"message": "Looks like You are either missing the new file or the file name you want to replace."}), 404
            if available_files:
                if len(available_files) > 1 and not file_number:
                    return jsonify({ "Found multiple files, pass the `file_number` with which you want to replace the file from the given list: ": [ str(number+1) + " --> " + file for number, file in enumerate(available_files)]})
                file_number = int(file_number) if file_number else 0
                try:
                    file_index = file_number - 1
                    print("Replacing file %s with %s" %(available_files[file_index], file_name))
                except IndexError:
                    return jsonify({ "message" : "You are passing the wrong file number. Retry without passing file number to see the list of files."}), 404
                if file_validater(file_name):
                    file_path = os.path.join(result_base_dir_path, available_files[file_index])
                    os.remove(file_path)
                    file_path = "/".join(file_path.split("/")[:-1])
                    file_path = os.path.join(file_path, file_name)
                    set_the_description(file_path, file_name, comment)
                    new_file.save(file_path)
                    return jsonify({"message": "File Replaced Successfully."})
                else:
                    return jsonify({"message": "Invalid file please select a valid type of file."}), 404
            else:
                return jsonify({"message": "File not found on the File Server."}), 404
        else:
            return jsonify({"message": "You don't have permission to access this API."}), 404
    return make_response(api_data_check, 401, {'WWW-Authenticate' : 'Basic realm="Login required!"'})
