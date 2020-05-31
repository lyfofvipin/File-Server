import os
from flask import jsonify, request, send_from_directory
from src import app, db, result_base_dir_path, Products, Arcs, Product_Versions, RHELS, RHOS, config_dir
from src.modules import list_dirs, file_validater


def home_page_api():
    folder_list = list_dirs(result_base_dir_path)
    return jsonify({ "products": [ product for product in folder_list]})

def download_api(next_url):
    path = os.path.join(result_base_dir_path, next_url)
    if os.path.isdir(path):
        return jsonify({"aviable_data_on_path": os.listdir(path)})
    elif os.path.exists(path):
        folder_path, file_path = "/".join(path.split("/")[:-1]), path.split('/')[-1]
        return send_from_directory(folder_path, file_path, as_attachment=True)
    else:
        return jsonify({"message": "Something is not right. Check and try again"}), 404

def upload_api(request):
    product, rhcert, rhos, arc, rhel  = request.args.get('product'), request.args.get('rhcert'), request.args.get('rhos'), request.args.get('arc'), request.args.get('rhel')  
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
