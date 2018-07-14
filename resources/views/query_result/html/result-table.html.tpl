<div id="result_table_<%= this.id %>" class="result-table">
  <% if (this.rows !== []) { %>
    <table id="table_<%= this.id %>" class="enumerated">
      <thead>
        <tr>
          <th>#</th>
          <% for (h of this.header) { %>
            <th><%= h %></th>
          <% } %>
        </tr>
      </thead>
      <tbody>
        
      </tbody>
    </table>
  <% } else { %>
    <table id="table_<%= this.id %>" class="no-result"> <tbody><td></td></tbody> </table>
  <% } %>
  <div class="pagination center"></div>
</div>