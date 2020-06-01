from src import app, Product_Versions, config_dir, result_base_dir_path
import os

def makedir(path):
    try:
        if not os.path.exists(path):
            os.mkdir(path)
    except FileExistsError:
        print("File allready exist.")

def create_directory_structure():
    for product in config_dir.keys():
        makedir(os.path.join(result_base_dir_path, product))
        for version in Product_Versions:
            makedir(os.path.join(result_base_dir_path, product, version))
            for sub_version in config_dir[product].keys():
                if sub_version: 
                    makedir(os.path.join(result_base_dir_path, product, version, sub_version))
                    for arc in config_dir[product][sub_version].keys():
                        makedir(os.path.join(result_base_dir_path, product, version, sub_version, arc))
                        for rhel in config_dir[product][sub_version][arc]:
                            makedir(os.path.join(result_base_dir_path, product, version, sub_version, arc, rhel))
                else:
                    for arc in config_dir[product][sub_version].keys():
                        makedir(os.path.join(result_base_dir_path, product, version, sub_version, arc))
                        for rhel in config_dir[product][sub_version][arc]:
                            makedir(os.path.join(result_base_dir_path, product, version, sub_version, arc, rhel))

if __name__ == "__main__":
    create_directory_structure()
    app.run(debug=True, host='0.0.0.0')
