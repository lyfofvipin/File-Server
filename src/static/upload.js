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
    var values = Object.keys(config_dir[product])
    remove_all_objects('sub_prod')
    insertValue('sub_prod', values)
    return true
}

function display_category(){
    var product = document.getElementById('product').value
    var sub_prod = document.getElementById('sub_prod').value
    var value = config_dir[product][sub_prod]
    remove_all_objects('category')
    insertValue('category', value)
    return true
}

function display_sub_category(){
    var product = document.getElementById('product').value
    var sub_prod = document.getElementById('sub_prod').value
    var category = document.getElementById('category').value
    var values = config_dir[product][sub_prod][category]
    remove_all_objects('sub_category')
    insertValue('sub_category', values)
    return true
}

function remove_all_objects(id_name){
    select = document.getElementById(id_name)
    for ( let x = select.length -1 ; x >= 0 ; x-- ){
        select[x].remove()
    }
    return true
}

function update_values_on_select( call_product='', call_sub_product='', call_category='', call_sub_category='' ){
    var product = document.getElementById('product').value
    var sub_prod = document.getElementById('sub_prod')
    var category = document.getElementById('category')
    var sub_category = document.getElementById('sub_category')

    if ( call_product ){
        if ( Object.keys(config_dir[product]).length == 1 && "" in config_dir[product] ){
            sub_prod.classList.add('display-hidden')
            display_sub_product()
        }
        else if ( Object.keys(config_dir[product]).length >= 1 ){
            sub_prod.classList.remove('display-hidden')
            display_sub_product()
        }
        else{
            sub_prod.classList.add('display-hidden')
        }
    
        if ( config_dir[product][sub_prod.value] != undefined && Object.keys(config_dir[product][sub_prod.value]).length == 1 && "" in config_dir[product][sub_prod.value] ){
            category.classList.remove('display-hidden')
            display_category()
        }
        else if ( config_dir[product][sub_prod.value] != undefined && Object.keys(config_dir[product][sub_prod.value]).length >= 1 ){
            category.classList.remove('display-hidden')
            display_category()
        }
        else{
            category.classList.add('display-hidden')
        }
    }
    else if ( call_sub_product ){
        if ( config_dir[product][sub_prod.value] != undefined && Object.keys(config_dir[product][sub_prod.value]).length == 1 && "" in config_dir[product][sub_prod.value] ){
            category.classList.remove('display-hidden')
            display_category()
        }
        else if ( config_dir[product][sub_prod.value] != undefined && Object.keys(config_dir[product][sub_prod.value]).length >= 1 ){
            category.classList.remove('display-hidden')
            display_category()
        }
        else{
            category.classList.add('display-hidden')
        }
    }
    if ( config_dir[product][sub_prod.value] != undefined && config_dir[product][sub_prod.value][category.value] != undefined && config_dir[product][sub_prod.value][category.value].length >= 1 ){
        sub_category.classList.remove('display-hidden')
        display_sub_category()
    }
    else{
        sub_category.classList.add('display-hidden')
    }
    return true
}

function clear_values_on_submit(){
    var sub_prod = document.getElementById('sub_prod')
    var category = document.getElementById('category')
    var sub_category = document.getElementById('sub_category')
    
    if ( sub_prod.classList.contains("display-hidden") ){
        remove_all_objects("sub_prod")
    }
    if ( category.classList.contains("display-hidden") ){
        remove_all_objects("category")
    }
    if ( sub_category.classList.contains("display-hidden") ){
        remove_all_objects("sub_category")
    }

}

// Setup Products select element Values in WUI
insertValue('product', config_dir)
update_values_on_select('product_call')
