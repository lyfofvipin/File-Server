import os
from flask import jsonify, request, send_from_directory, make_response
from src import app, db, result_base_dir_path, Products, Categories, Product_Versions, Sub_Categories, Sub_Product_Versions, config_dir, bcrypt
from src.modules import list_dirs, file_validater, get_value
from src.models import User


def home_page_api():
    folder_list = list_dirs(result_base_dir_path)
    return jsonify({ "products": [ product for product in folder_list]})

def download_api(request):
    auth = request.authorization
    if not auth or not auth.username or not auth.password:
        return make_response('Login fail please pass the correct credentials.', 401, {'WWW-Authenticate' : 'Basic realm="Login required!"'})
    user = User.query.filter_by(username=auth.username).first()
    if bcrypt.check_password_hash(user.password, auth.password) and user:
        product, rhcert, rhos, arc, rhel, file_name = request.args.get('product'), request.args.get('rhcert'), request.args.get('rhos'), request.args.get('arc'), request.args.get('rhel'), request.args.get('file')
        if not (product and rhcert and arc and rhel) and file_name: return jsonify({'message': "You are missing some arguments"}), 404
        path = os.path.join(result_base_dir_path, product if product else "", "RHCERT-"+rhcert if rhcert else "", "RHOSP-"+rhos if rhos else "", arc if arc else "", "RHEL-"+rhel if rhel else "")
        if os.path.isdir(path):
            files = [ x for x in os.listdir(path) if x != "site.db"]
            return jsonify({"aviable_data_on_path": files})
        elif os.path.exists(path):
            return send_from_directory(path, file_name, as_attachment=True)
        else:
            return jsonify({"message": "Something is not right. Check and try again"}), 404
    return make_response('Login fail please pass the correct credentials.', 401, {'WWW-Authenticate' : 'Basic realm="Login required!"'})

def upload_api(request):
    auth = request.authorization
    if not auth or not auth.username or not auth.password:
        return make_response('Login fail please pass the correct credentials.', 401, {'WWW-Authenticate' : 'Basic realm="Login required!"'})
    user = User.query.filter_by(username=auth.username).first()
    if user.role:
        if bcrypt.check_password_hash(user.password, auth.password) and user:
            product, rhcert, rhos, arc, rhel  = request.args.get('product'), request.args.get('rhcert'), request.args.get('rhos'), request.args.get('arc'), request.args.get('rhel')
            if not (product and rhcert and arc and rhel): return jsonify({'message': "You are missing some arguments"}), 404
            path = os.path.join(result_base_dir_path, product if product else "", "RHCERT-"+rhcert if rhcert else "", "RHOSP-"+rhos if rhos else "", arc if arc else "", "RHEL-"+rhel if rhel else "")
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
    return make_response('Login fail please pass the correct credentials.', 401, {'WWW-Authenticate' : 'Basic realm="Login required!"'})