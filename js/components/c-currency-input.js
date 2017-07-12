/**
 * CURRENCYINPUT.JS
 *
 * Custom jQuery plugin to automatically format input fields as currency and handle input.
 */


;(function ($, window, document, undefined) {

  var
    pluginName = 'currencyInput'
    ;

  // Plugin constructor
  function Plugin(element, options) {
    this.element = element;
    this.$element = $(element);
    this._name = pluginName;

    this.init();
  }

  Plugin.prototype.init = function () {
    var that = this;

    // Enhance the input
    this.$element
      .on('input, change, keyup', function(e){
        var start = that.element.selectionStart;

        if(start == 0) {
          
        } else {
          that.updateValue();
        }
        
      });

      this.$element
      .on('input .slider_input, change, keyup', function(e){
        var $this = $(this);
        var start = that.element.selectionStart;
        that.updateText($this);        
      });

    // Set value on init
    that.updateValue();
    // that.updateText();
  };

  Plugin.prototype.updateValue = function () {
    // Record cursor positions and event keycode; convert input value to a number
    var
      initial_value = this.element.value,
      number = accounting.unformat(this.element.value) / 1,
      start = this.element.selectionStart,
      end = this.element.selectionEnd,
      from_right = initial_value.length - start,
      key_pressed = (typeof event !== 'undefined' && event !== null) ? event.keyCode || event.charCode : null;
    ;

    // Only format string if it is a valid format to start with
    if (this.element.value !== '' && !isNaN(number)) {

      // If backspace is typed with the cursor to the right of a comma, delete both
      // the comma and preceeding number. This is to avoid locking up the cursor as our
      // currency formatter would add the comma back
      if ( key_pressed === 8 && initial_value.length > 3) {
        if (from_right === 3 || from_right === 7 || from_right === 11 || from_right === 15) {
          this.element.value = initial_value.slice(0, start-1) + initial_value.slice(end, initial_value.length);
        }
      }

      // Format the value as currency (with commas)
      this.element.value = accounting.formatNumber(this.element.value);

      // Re-set the range, accounting for difference in legth of initial value and formatted
      // value (so our cursor jumps past any added commas)
      var diff = this.element.value.length - initial_value.length;
      this.element.setSelectionRange(start + diff, end + diff);
    }
  };

   Plugin.prototype.updateText = function (ctx) {
    // Record cursor positions and event keycode; convert input value to a number
    var
      initial_value = this.element.value,
      number = accounting.unformat(this.element.value) / 1,
      start = this.element.selectionStart,
      end = this.element.selectionEnd,
      from_right = initial_value.length - start,
      key_pressed = (typeof event !== 'undefined' && event !== null) ? event.keyCode || event.charCode : null;
    ;

    // Only format string if it is a valid format to start with
    if (this.element.value !== '' && !isNaN(number)) {

      // If backspace is typed with the cursor to the right of a comma, delete both
      // the comma and preceeding number. This is to avoid locking up the cursor as our
      // currency formatter would add the comma back
      if ( key_pressed === 8 && initial_value.length > 3) {
        if (from_right === 3 || from_right === 7 || from_right === 11 || from_right === 15) {
          this.element.value = initial_value.slice(0, start-1) + initial_value.slice(end, initial_value.length);
        }
      }

      // Format the value as currency (with commas)
      this.element.value = accounting.formatNumber(this.element.value);
      var pValue= this.element.value;
      // var elem = this.element.className.split(' ');
      ctx.parent('.range_slider_container').find('.slide_format_currency').text("$"+pValue);

      // Re-set the range, accounting for difference in legth of initial value and formatted
      // value (so our cursor jumps past any added commas)
      var diff = this.element.value.length - initial_value.length;
      this.element.setSelectionRange(start + diff, end + diff);
    }
  };

  // A lightweight plugin wrapper to prevent against multiple instantiations
  $.fn[pluginName] = function (options) {
    return this.each(function () {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName,
          new Plugin(this, options));
      }
    });
  };

})(jQuery, window, document);
