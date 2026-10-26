// Minimální šablonovací runtime pro stránky převzaté z návrhového plátna.
// Šablona v <template> používá {{cesta}}, <sc-for list as> a <sc-if value>;
// komponenta (class Component extends DCLogic) vrací hodnoty z renderVals().
// Po setState se nová podoba porovná se stávajícím DOM a změní se jen to, co se
// liší — prvky zůstávají na místě, takže se neruší fokus, posuvník ani animace.
// Prvek s jiným data-k se vymění celý (např. nový krok formuláře).
(function () {
  'use strict';

  function DCLogic(props) {
    this.props = props || {};
    this.state = {};
  }
  DCLogic.prototype.setState = function () {};

  var HOLE = /\{\{\s*([\w.$]+)\s*\}\}/g;
  var ONLY = /^\{\{\s*([\w.$]+)\s*\}\}$/;
  var BOOL_ATTRS = { checked: 1, disabled: 1, selected: 1, hidden: 1, open: 1 };

  function lookup(scopes, path) {
    if (path === 'true') return true;
    if (path === 'false') return false;
    var parts = path.split('.');
    for (var i = 0; i < scopes.length; i++) {
      var s = scopes[i];
      if (s && Object.prototype.hasOwnProperty.call(s, parts[0])) {
        var v = s[parts[0]];
        for (var j = 1; j < parts.length; j++) v = v == null ? undefined : v[parts[j]];
        return v;
      }
    }
    return undefined;
  }

  function interp(str, scopes) {
    var m = str.match(ONLY);
    if (m) return lookup(scopes, m[1]);
    return str.replace(HOLE, function (_, p) {
      var v = lookup(scopes, p);
      return v == null || typeof v === 'function' ? '' : String(v);
    });
  }

  function expand(node, scopes, out) {
    if (node.nodeType === 3) {
      var t = node.nodeValue;
      if (t.indexOf('{{') >= 0) {
        var tv = interp(t, scopes);
        t = tv == null || typeof tv === 'function' ? '' : String(tv);
      }
      out.appendChild(document.createTextNode(t));
      return;
    }
    if (node.nodeType !== 1) return;
    var tag = node.tagName.toLowerCase();
    if (tag === 'sc-for') {
      var list = interp(node.getAttribute('list') || '', scopes) || [];
      var as = node.getAttribute('as');
      for (var k = 0; k < list.length; k++) {
        var local = {}; local[as] = list[k];
        var inner = [local].concat(scopes);
        for (var c = 0; c < node.childNodes.length; c++) expand(node.childNodes[c], inner, out);
      }
      return;
    }
    if (tag === 'sc-if') {
      if (interp(node.getAttribute('value') || '', scopes)) {
        for (var d = 0; d < node.childNodes.length; d++) expand(node.childNodes[d], scopes, out);
      }
      return;
    }
    var el = node.cloneNode(false);
    var attrs = Array.prototype.slice.call(el.attributes);
    for (var a = 0; a < attrs.length; a++) {
      var name = attrs[a].name, raw = attrs[a].value;
      if (raw.indexOf('{{') < 0) continue;
      var v = interp(raw, scopes);
      if (name.indexOf('on') === 0) {
        el.removeAttribute(name);
        if (typeof v === 'function') {
          (el.__dcOn = el.__dcOn || {})[name.slice(2)] = v;
          bindEvents(el);
        }
      } else if (BOOL_ATTRS[name]) {
        if (v && v !== 'false') { el.setAttribute(name, ''); el[name] = true; }
        else { el.removeAttribute(name); el[name] = false; }
      } else {
        el.setAttribute(name, v == null ? '' : String(v));
        if (name === 'value' && 'value' in el) el.value = v == null ? '' : String(v);
      }
    }
    var src = node.tagName.toLowerCase() === 'template' ? node.content : node;
    for (var e = 0; e < src.childNodes.length; e++) expand(src.childNodes[e], scopes, el);
    out.appendChild(el);
  }

  // Posluchač se na prvek přidá jen jednou a volá vždy aktuální handler z __dcOn,
  // takže po překreslení nezůstanou staré closury se starým stavem.
  function bindEvents(el) {
    var bound = el.__dcBound || (el.__dcBound = {});
    for (var type in el.__dcOn) {
      if (bound[type]) continue;
      bound[type] = true;
      el.addEventListener(type, function (ev) {
        var h = el.__dcOn && el.__dcOn[ev.type];
        if (h) h(ev);
      });
    }
  }

  function sameNode(a, b) {
    if (a.nodeType !== b.nodeType) return false;
    if (a.nodeType !== 1) return true;
    return a.tagName === b.tagName && (a.getAttribute('data-k') || '') === (b.getAttribute('data-k') || '');
  }

  function patchElement(a, b) {
    var i, attr;
    for (i = a.attributes.length - 1; i >= 0; i--) {
      attr = a.attributes[i].name;
      if (!b.hasAttribute(attr)) a.removeAttribute(attr);
    }
    for (i = 0; i < b.attributes.length; i++) {
      attr = b.attributes[i];
      if (a.getAttribute(attr.name) !== attr.value) a.setAttribute(attr.name, attr.value);
    }
    // Vlastnosti formulářových prvků měníme jen při rozdílu — jinak by skákal kurzor.
    if ('value' in b && a.value !== b.value) a.value = b.value;
    if ('checked' in b && a.checked !== b.checked) a.checked = b.checked;
    a.__dcOn = b.__dcOn;
    if (a.__dcOn) bindEvents(a);
    morphChildren(a, b);
  }

  function morphChildren(parent, next) {
    var oldKids = Array.prototype.slice.call(parent.childNodes);
    var newKids = Array.prototype.slice.call(next.childNodes);
    for (var i = 0; i < newKids.length; i++) {
      var a = oldKids[i], b = newKids[i];
      if (!a) parent.appendChild(b);
      else if (!sameNode(a, b)) parent.replaceChild(b, a);
      else if (a.nodeType === 1) patchElement(a, b);
      else if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue;
    }
    for (var j = newKids.length; j < oldKids.length; j++) parent.removeChild(oldKids[j]);
  }

  function renderInto(root, tpl, vals) {
    var frag = document.createDocumentFragment();
    var src = tpl.content || tpl;
    for (var i = 0; i < src.childNodes.length; i++) expand(src.childNodes[i], [vals], frag);
    root.replaceChildren(frag);
  }

  function mount(root, tpl, Comp, props) {
    var inst = new Comp(props || {});
    function render() {
      var active = document.activeElement;
      var id = active && root.contains(active) ? active.id : '';
      var sel = null;
      try { if (id && active.selectionStart != null) sel = [active.selectionStart, active.selectionEnd]; } catch (e) {}
      var frag = document.createDocumentFragment();
      var src = tpl.content || tpl;
      var vals = inst.renderVals();
      for (var i = 0; i < src.childNodes.length; i++) expand(src.childNodes[i], [vals], frag);
      morphChildren(root, frag);
      if (id && document.activeElement !== active) {
        var again = document.getElementById(id);
        if (again) {
          again.focus({ preventScroll: true });
          try { if (sel) again.setSelectionRange(sel[0], sel[1]); } catch (e) {}
        }
      }
    }
    inst.setState = function (patch) {
      for (var key in patch) inst.state[key] = patch[key];
      render();
    };
    render();
    return inst;
  }

  window.DCLogic = DCLogic;
  window.DCMini = { mount: mount, renderInto: renderInto };
})();
