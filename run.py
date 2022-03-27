from src import app, Product_Versions, config_dir, result_base_dir_path, create_file_structure, port, skip_product_version_creation_for_products
import os

def makedir(path):
    try:
        if not os.path.exists(path):
            os.mkdir(path)
    except FileExistsError:
        print("File already exist.")

def create_directory_structure(create_file_structure):
    if not create_file_structure:
        return create_file_structure
    for product in config_dir.keys():
        makedir(os.path.join(result_base_dir_path, product))
        for version in Product_Versions:
            if "*" in skip_product_version_creation_for_products or product in skip_product_version_creation_for_products:
                version = ""
            else:
                makedir(os.path.join(result_base_dir_path, product, version))
            for sub_version in config_dir[product].keys():
                if sub_version: 
                    makedir(os.path.join(result_base_dir_path, product, version, sub_version))
                    for sub_category in config_dir[product][sub_version].keys():
                        makedir(os.path.join(result_base_dir_path, product, version, sub_version, sub_category))
                        for category in config_dir[product][sub_version][sub_category]:
                            makedir(os.path.join(result_base_dir_path, product, version, sub_version, sub_category, category))
                else:
                    for sub_category in config_dir[product][sub_version].keys():
                        makedir(os.path.join(result_base_dir_path, product, version, sub_version, sub_category))
                        for category in config_dir[product][sub_version][sub_category]:
                            makedir(os.path.join(result_base_dir_path, product, version, sub_version, sub_category, category))

if __name__ == "__main__":
    create_directory_structure(create_file_structure)
    app.run(debug=True, host='0.0.0.0', port=port)
