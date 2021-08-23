// Here value of config_dir is coming from the Python Backend

function insertValue(id_name, values)
{
    var select = document.getElementById(id_name)
    for (let value in values) {
        // Create a new Option and Value
        newOption = document.createElement("OPTION"),
        newOptionVal = document.createTextNode(value);

        newOption.appendChild(newOptionVal);
        select.insertBefore(newOption,select.firstChild);
    }
}

function display_sub_product() {
    var product = document.getElementById('product').value
    values = config_dir[product]
    insertValue('sub_prod', values)
}

function display_category(){
    var product = document.getElementById('product').value
    var sub_prod = document.getElementById('sub_prod').value
    var value = config_dir[product][sub_prod]
    insertValue('category', value)
}

function display_sub_category(){
    var product = document.getElementById('product').value
    var sub_prod = document.getElementById('sub_prod').value
    var category = document.getElementById('category').value
    var values = config_dir[product][sub_prod][category]
    var select = document.getElementById('sub_category')
    for (let i = 0; i < values.length; i++) {
        newOption = document.createElement("OPTION"),
        newOptionVal = document.createTextNode(values[i]);
        newOption.appendChild(newOptionVal);
        select.insertBefore(newOption,select.firstChild);
    }
}

function update_for_product_selection(){
    // Refresh Sub_Products select element Values in WUI
    display_sub_product()
    // Refresh Category select element Values in WUI
    display_category()
    // Refresh Sub_Category select element Values in WUI
    display_sub_category()
}

function update_for_sub_product_selection(){
    // Refresh Category select element Values in WUI
    display_category()
    // Refresh Sub_Category select element Values in WUI
    display_sub_category()
}

// Setup Products select element Values in WUI
insertValue('product', config_dir)
// Setup Sub_Products select element Values in WUI
display_sub_product()
// Setup Category select element Values in WUI
display_category()
// Setup Sub_Category select element Values in WUI
display_sub_category()


// rhos = document.getElementById("rhos")
//     instance_type = document.getElementById("instance_type")
//     product = document.getElementById("product")
//     if (product.value === "rhosp")
//         rhos.classList.remove("display-hidden")
//     else
//         rhos.classList.add("display-hidden")
//     if (product.value === "cloud-instance-type")
//         instance_type.classList.remove("display-hidden")
//     else
//         instance_type.classList.add("display-hidden")