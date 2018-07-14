<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0" content="default-src 'none'; img-src vscode-resource: https:; script-src vscode-resource:; style-src vscode-resource:;">
        
        <%= css("../css/styles.css") %>
        <%= css("../css/resultHeader.css") %>
        <%= css("../css/resultTable.css") %>
    </head>

    <body>
        <div id='section-query-results'>
          <% for (result of this.resultSet) { %>
            <div class="result-wrapper">
              <%= tpl("result-header.html.tpl", {stmt: result.stmt, id: result.id}) %>
              <%= tpl("result-table.html.tpl", {header: result.header, rows: result.rows, id: result.id}) %>
              <div class="separator"></div>
            </div>
          <% } %>
        </div>
    </body>

    <%= js("../js/paginator2.js") %>
    <%= js("../js/index.js") %>

    <script>
      <% for (var result of this.resultSet) { %>
        var elem = document.getElementById("result_table_<%= result.id %>");
        paginator({
            tableId: elem.getElementsByTagName('table')[0].id,
            box: elem.getElementsByClassName("pagination")[0],
            rowsPerPage: <%= this.recordsPerPage %>,
            rows: <%= JSON.stringify(result.rows) %>
        });
      <% } %>
    </script>
</html>