import os
from flask import jsonify, request, send_from_directory, make_response
from src import app, db, result_base_dir_path, Products, Categories, Product_Versions, Sub_Categories, Sub_Product_Versions, config_dir, bcrypt
from src.modules import list_dirs, file_validater, get_value
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
        product, version, sub_prod, sub_category, category, file_name = request.args.get('product'), request.args.get('version'), request.args.get('sub_prod'), request.args.get('sub_category'), request.args.get('category'), request.args.get('file')
        path = os.path.join(result_base_dir_path, get_value(product), get_value(version), get_value(sub_prod), get_value(category), get_value(sub_category))
        if os.path.isdir(path) and not file_name:
            files = [ x for x in os.listdir(path) if x != "site.db"]
            return jsonify({"aviable_data_on_path": files})
        elif os.path.exists(path):
            return send_from_directory(path, file_name, as_attachment=True)
        else:
            return jsonify({'Message' : 'Looks like you enter something wrong. Please try again.',
                "Supported Hierarchy": config_dir}), 404
    return make_response(api_data_check, 401, {'WWW-Authenticate' : 'Basic realm="Login required!"'})

def upload_api(request):
    api_data_check = api_data_validator(request)
    if "Auth Verified." in api_data_check:
        if api_data_check[-1]:
            product, version, sub_prod, category, sub_category  = request.args.get('product'), request.args.get('version'), request.args.get('sub_prod'), request.args.get('category'), request.args.get('sub_category')
            path = os.path.join(result_base_dir_path, get_value(product), get_value(version), get_value(sub_prod), get_value(category), get_value(sub_category))
            if 'file' not in request.files: return jsonify({'message' : 'No file part in the request'}), 404
            file = request.files['file']
            if file.filename == '': return jsonify({'message': 'No file selected for uploading'}), 404
            if not file_validater(file.filename): return jsonify({'message': 'Invalid file'}), 404
            if os.path.exists(path):
                if os.path.exists(os.path.join(path, file.filename)):
                    return jsonify({'message' : 'This file is allready on the server.'})
                else:
                    file.save(os.path.join(path, file.filename))
                    return jsonify({'message' : 'File Uploaded successfully'})
            else:
                return jsonify({'Message' : 'Looks like you enter something wrong. Please try again.',
                "Supported Version": config_dir}), 404
        else:
            return jsonify({"message": "You don't have permission to access this api."})
    return make_response(api_data_check, 401, {'WWW-Authenticate' : 'Basic realm="Login required!"'})
