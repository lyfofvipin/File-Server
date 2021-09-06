// Here value of config_dir is coming from the Python Backend

function insertValue(id_name, values)
{
    var select = document.getElementById(id_name)
    if ( Array.isArray(values)){
        var new_values = {}
        for (let index = 0; index < values.length; index++) {
            new_values[values[index]] = values[index]
        }
        values = new_values
    }
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
    remove_all_objects('sub_prod')
    insertValue('sub_prod', values)
}

function display_category(){
    var product = document.getElementById('product').value
    var sub_prod = document.getElementById('sub_prod').value
    var value = config_dir[product][sub_prod]
    remove_all_objects('category')
    insertValue('category', value)
}

function display_sub_category(){
    var product = document.getElementById('product').value
    var sub_prod = document.getElementById('sub_prod').value
    var category = document.getElementById('category').value
    var values = config_dir[product][sub_prod][category]
    remove_all_objects('sub_category')
    insertValue('sub_category', values)
}

function remove_all_objects(id_name){
    select = document.getElementById(id_name)
    for ( let x = select.length ; x > 0 ; x-- ){
        select[x].remove()
    }
}

function update_values_on_select(){
    var product = document.getElementById('product').value
    function check_availability(){
        try{
            var values = config_dir[product][sub_prod][category]
            insertValue('sub_category', values)
            document.getElementById('category').style.display = "none"
        }
        catch( err ){
            console.log("Seems like we don't have any sub_category for the same.")
            document.getElementById('category').style.display = "none"
        }
    }
    if ( Object.keys(config_dir[product]) >= 1 ){
        document.getElementById('sub_prod').classList.remove('display-hidden')
        display_sub_product()
    }
    else{
        document.getElementById('sub_prod').classList.add('display-hidden')
    }
    if (check_availability())
    // check_availability()
    if ( Object.keys(config_dir[product]) >= 1 ){
        document.getElementById('sub_prod').classList.remove('display-hidden')
        display_sub_product()
    }

}

function update_for_product_selection(){
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



// // Setup Sub_Products select element Values in WUI
// display_sub_product()
// // Setup Category select element Values in WUI
// display_category()
// // Setup Sub_Category select element Values in WUI
// display_sub_category()
