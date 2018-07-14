
function paginator(options) {
    var rows = options["rows"] || [];

    var rowsPerPage = options["rowsPerPage"] || 50;
    rowsPerPage = rowsPerPage < 1 ? rows.length : rowsPerPage;

    var tableId = options["tableId"];

    var box = options["box"];

    var fieldsPerRow = (rows.length > 0 ? rows[0].length : 0) +1;

    var page = 1;

    var pages = Math.ceil(rows.length / rowsPerPage);

    var tbody = document.getElementById(tableId).getElementsByTagName("tbody")[0];
    tbody.innerHTML = "";
    for (var i = 0; i < rowsPerPage; i++) {
        let tr = document.createElement("tr");
        tr.style.display = "none";
        for (var j = 0; j < fieldsPerRow; j++) {
            let td = document.createElement("td");
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }

    changePage(page, pages, rows, rowsPerPage, tableId, box);
}

function changePage(page, pages, rows, rowsPerPage, tableId, box) {
    let startSlice = (page - 1) * rowsPerPage;
    let endSlice = page * rowsPerPage;
    let rowsSlice = rows.slice(startSlice, endSlice);
    swap(rows, startSlice, tableId);
    makePagination(page, pages, rows, rowsPerPage, tableId, box);
}

function makePagination(page, pages, rows, rowsPerPage, tableId, box) {

    var make_button = function (symbol, index, disabled) {
        var button = document.createElement("button");
        button.innerHTML = symbol;
        button.addEventListener("click", function (event) {
            event.preventDefault();
            if (this.disabled != true) {
                changePage(index, pages, rows, rowsPerPage, tableId, box);
            }
            return false;
        }, false);
        if (disabled) {
            button.disabled = true;
        }
        return button;
    }

    // make page button collection
    var page_box = document.createElement("div");

    var left = make_button("&#10094;", (page > 1 ? page - 1 : 1), (page == 1));
    page_box.appendChild(left);

    var pageInput = document.createElement("input");
    pageInput.type = "number";
    pageInput.max = pages;
    pageInput.min = 1;
    pageInput.value = page;
    pageInput.onkeypress = function(e) {
        if (!e) e = window.event;
        var keyCode = e.keyCode || e.which;
        if (keyCode == '13'){
            e.preventDefault();
            changePage(parseInt(this.value), pages, rows, rowsPerPage, tableId, box);
            return false;
        }
    }
    page_box.appendChild(pageInput);

    var pageSpan = document.createElement("span");
    pageSpan.innerText = '/'+pages;
    pageSpan.style = "padding:4px 0;opacity: 0.6;"
    page_box.appendChild(pageSpan);

    var right = make_button("&#10095;", (pages > page ? page + 1 : page), (page == pages));
    page_box.appendChild(right);

    if (box.childNodes.length) {
        while (box.childNodes.length > 1) {
            box.removeChild(box.childNodes[0]);
        }
        box.replaceChild(page_box, box.childNodes[0]);
    } else {
        box.appendChild(page_box);
    }
}

function swap(rows, startRow, tableId) {
    var tbody = document.getElementById(tableId).getElementsByTagName("tbody")[0];
    for (var i = 0; i < tbody.children.length; i++) {
        let tr = tbody.children[i];
        if (i < rows.length) {
            tr.style.display = "";
            for (var j = 0; j < tr.children.length; j++) {
                if (j === 0) {
                    tr.children[j].innerText = startRow+i+1;
                } else {
                    tr.children[j].innerText = rows[startRow+i][j-1];
                }
            }
        } else {
            tr.style.display = "none";
        }
    }
}