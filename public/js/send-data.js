function sendData(action, data) {
    console.log(action);
    console.log(data);
    let form = document.createElement('form');
    form.setAttribute('method', 'post');
    form.setAttribute('action', action);

    for (const input in data) {
        let inputTag = document.createElement('input');
        inputTag.setAttribute('type', 'hidden');
        inputTag.setAttribute('name', input);
        inputTag.setAttribute('value', data[input]);
        form.appendChild(inputTag);
    }

    form.setAttribute('visibility', 'hidden');
    document.body.appendChild(form);
    form.submit();
}