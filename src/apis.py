import os
from flask import jsonify, request, send_from_directory
from src import app, db, result_base_dir_path, Products, Arcs, Product_Versions, RHELS, RHOS
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
        return jsonify({"message": "Looks like API URL is not correct. Check and try again"})
