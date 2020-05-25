import os

def list_dirs(result_base_dir_path):
    for files in os.listdir(result_base_dir_path):
        file_path = os.path.join( result_base_dir_path + files)
        if os.path.isdir(file_path): yield files
