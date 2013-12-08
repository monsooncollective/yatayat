// route information sidebar

    function routeinfopanel(routes) {
        var panel = document.getElementById("routename");
        var rdiv = document.createElement('div');
        rdiv.setAttribute("class","btn-group");
        rdiv.setAttribute("data-toggle","buttons");
        panel.appendChild(rdiv);
        c = 0;
        _(routes).each(function(r) {
            var button = document.createElement('input');
            button.type = 'radio';
            button.name = 'options';
            button.id = r.id;
            button.setAttribute("onclick", "YY.single_route_render(system,system.routeDict[this.id])");
            // button.setAttribute("data-toggle","button");
            var label = document.createElement('label');
            label.setAttribute("class","btn btn-primary");
            label.innerHTML = r.name;
            label.appendChild(button);
            rdiv.appendChild(label);
        })
    }