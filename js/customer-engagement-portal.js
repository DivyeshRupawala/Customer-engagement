/**
 * CUSTOMER-ENGAGEMENT-PORTAL.JS
 * Controls behavior of portal UI elements
 */
;(function ($, window, document, undefined) {
  // Postpone execution until DOM is loaded
  $(function() {
    var API_URL_PREFIX = "../NewfiWeb/rest/";
  // var API_URL_PREFIX = "https://pg1.newfi.com/NewfiWeb/rest/";
    /**
     * Setup several app-wide collections:
     * 1. dict:
     *      Dictionaries used for human-readable strings.
     * 2. config:
     *      Configuration objects used throughout the app.
     * 3. dom:
     *      Cached jQuery object hooks to important DOM elements
     * 4. state:
     *      Application state
     * 5. util:
     *      Misc utility methods, unrelated to app execution logic
     */
    var
      dict = {
        'loantype_labels': {
          'new-purchase': 'Home Purchase',
          'refinance':    'Refinance',
          'cashout':      'Take Out Cash',
        },
        'field_summary_labels': {
          'zipcode':            'Zip Code',
          'residencetype':      'Property Type',
          'propertyuse':        'Property Use',
          'creditscore':        'Est. Credit Score',
          'purchaseprice':      'Purchase Price',
          'downpaymentpercent': 'Down Payment',
          'estval':             'Est. Home Value',
          'curmortgagebalance': 'Mortgage Balance',
          'fha':                'FHA Loan',
          'cashout':            'Cash Out'
        },

        'tooltips': {
        /* eslint-disable max-len */
         'rate':      'The interest rate is the yearly rate charged by the lender to a borrower in order for the borrower to obtain a loan. This is expressed as a percentage of the total amount loaned. Note that rates may increase for adjustable rate mortgages.',
         'apr':       'Annual percentage rate (APR) is the cost of credit expressed as a yearly rate. The APR includes the interest rate, points, lender fees, and certain other financing charges the borrower is required to pay.',
         'closing':   'Click on the Detailed Costs button for details of the total estimated closing closts.',
         'monthlies': 'This is the estimated monthly mortgage payment for principal and interest only. This does not include property taxes, homeowner’s insurance, or mortgage insurance (if applicable), which could increase your monthly payment.'
         /* eslint-enable max-len */
         },
         'tracking_events':         {
          'entered_loan_details': {'category': 'Rate Quote', 'action': 'Entered Loan Details'},
          'viewed_rate':          {'category': 'Rate Quote', 'action': 'Viewed Rate Details'},
          'selected_rate':        {'category': 'Rate Quote', 'action': 'Selected a Rate'}
        }
       },

      config = {
        'loantypes': {
          'new-purchase': {
            'fields': [
              'zipcode',
              'residencetype',
              'propertyuse',
              'creditscore',
              'purchaseprice',
              'downpaymentpercent'
            ]
          },
          'refinance': {
            'fields': [
              'zipcode',
              'residencetype',
              'propertyuse',
              'creditscore',
              'estval',
              'curmortgagebalance',
              'fha'
            ]
          },
          'cashout': {
            'fields': [
              'zipcode',
              'residencetype',
              'propertyuse',
              'creditscore',
              'estval',
              'curmortgagebalance',
              'cashout'
            ]
          }
        },

        'program_product_sort': {
          'CONFORMING':     100,
          'NONCONFORMING':  200,
          'FHA':            300,
          'FHA-Streamline': 400
        },

        'program_name_sort': {
          "30 YEAR Fixed": 10,          
          "20 YEAR Fixed": 20,
          "15 YEAR Fixed": 30,
          "10 YEAR Fixed": 40,
          "30 YEAR ARM"  : 50,
          "10 YEAR ARM"  : 60,
          "7 YEAR ARM"   : 70,
          "5 YEAR ARM"   : 80
        },

        // Dynamic html templates
        'templates': {
          'details_summary':        Handlebars.compile($('#details_summary_template').html()),
          'rate_loading_animation': Handlebars.compile($('#rate_loading_animation_template').html()),
          'rates_listing':          Handlebars.compile($('#rates_listing_template').html()),
          'rates_detail':           Handlebars.compile($('#rates_detail_template').html()),
          'chosen_rate_summary':    Handlebars.compile($('#chosen_rate_summary_template').html()),
          'tooltip':                Handlebars.compile($('#tooltip_template').html())
        }
      },

      dom = {
        // jQuery object hooks
        $loan_form:                                 $('[data-js=loan-form]'),
        $loantype_radioset:                         $('[data-js=loantype-radioset]'),
        $loan_form__collect_details_stage:          $('[data-js=loan-form__collect-details-stage]'),
        $loan_summary:                              $('[data-js=loan-form__details-summary-stage]'),
        $loan_form__details_summary_injectionpoint: $('[data-js=loan-form__details-summary-injectionpoint]'),
        $ratetype_radioset:                         $('[data-js=ratetype-radioset]'),
        $ratetype_form__wrapper:                    $('[data-js=rates-listing__wrapper]'),
        $ratetype_form:                             $('[data-js=ratetype-form]'),
        $rates_listing__wrapper:                    $('[data-js=rates-listing__injectionpoint]'),
        $user_registration__wrapper:                $('[data-js=user-registration-wrapper]'),
        $user_registration_form:                    $('[data-js=user-registration-form]'),
        $rate_list_error:                           $('[data-js=rate-list-error]'),
        $user_query_form:                           $('[data-js=user-query-form]')
      },

      // Application state
      state = {
        'loan_advisors': null,
        'data_cache':    {
          'rates':        {
            'request':     null,
            'response':    null,
            'cleaned':     null
          }
        },
        'chosen_loan_type': null,
        'chosen_program':   null,
        'chosen_rate':      null,
        'tracking_events':         {
          'entered_loan_details': false,
          'viewed_rate':          false,
          'selected_rate':        false
        }
      },

      util = {
        // Remove formatting from nubers formatted for display as currency amounts
        currencyToFloat: function currencyToFloat(value) {
          return 1 * accounting.unformat(value);
        }
      },
      lasearch = false,
      loanAdvisorList =[],
      loanAdvisorMap =[],
      userRegistrationValidator = null;

      var notaryfeeLQB = 25;

    /**
     * function init()
     *
     * App initialization
     *
     * 1. Apply custom jQuery plugin behaviors to form elements
     * 2. Add custom validators for the jQuery.validate plugin
     * 3. Setup handlers and validation for forms
     * 4. Add handlers for dynamically generated interactive elements
     *
     * @return none
     */
    function init() {
      /**
       *  1. Apply custom jQuery plugin behaviors to form elements
       */

      // Auto-format currency fields
      $('input[data-format-as-currency]').currencyInput();
      $('input[data-format-span-as-currency]').currencyInput();
      // Initialize linked slider for purchase price»down payment fields
      //$('#downpaymentpercent').linkedPercentSlider();

      // Hide UI elements not in-use at outset
      dom.$loan_form__collect_details_stage.hide();
      $('[data-js^=details--]', dom.$loan_form__collect_details_stage).hide();
      dom.$ratetype_form__wrapper.hide();
      toggleAdvisorInput();

      /*
       * 2. Add custom validators for the jQuery.validate plugin
       */
      addCustomFormFieldValidators();

      getNewfiAdvisors();

      /*
       * 3. Setup handlers and validation for forms
       */
      dom.$ratetype_form
        // Handle selection of rate types
        .on( 'change', 'input[name=ratetype]', switchRateTypes)
        // Handle submission of rates form
        .on( 'submit', function(ev){
          ev.preventDefault ? ev.preventDefault() : (ev.returnValue = false); // IE
          ev.cancelBubble = true; // IE
          switchRateTypes();
          return false; // IE
        })
        ;

      dom.$user_query_form.
      on('submit', function(ev){
        ev.preventDefault ? ev.preventDefault() : (ev.returnValue = false);

        userqueryFormValidation();
        if($(this).valid()) {
          submitUserQuery($(this));
        }
      })

      dom.$user_registration_form
        // Handle selection of loan types
        .on( 'change, click', 'input[name=newfiadvisor]', toggleAdvisorInput)
        // Handle submission of details form
        .on( 'submit', function(ev){
          ev.preventDefault ? ev.preventDefault() : (ev.returnValue = false); // IE
          // ev.cancelBubble = true; // IE

          userRegistrationFormValidation();

          if ($(this).valid()) {
            submitUserRegistration(this);
          }
          // return false; // IE
        })
        ;

      dom.$loan_form
        // Handle selection of loan types
        .on( 'change', 'input[name=loantype]', switchLoanTypes)
        // Handle submission of details form
        .on( 'submit', function(ev){
          ev.preventDefault ? ev.preventDefault() : (ev.returnValue = false); // IE
          if ($(this).valid()) {
            $('#basic-information').fadeOut(300);
            dom.$rate_list_error.fadeOut(300);
            if(state.chosen_loan_type == 'refinance') {

              var estVal = parseInt($('#estval').val().replace(/,/g, ''));
              var mortBal = parseInt($('#curmortgagebalance').val().replace(/,/g, ''));

              if(estVal < mortBal) {

                $('#estval-compare-error').text('Property value must be higher than loan amount : ' + mortBal);
                $('#estval-compare-error').css('display', 'block');
                return false;

              } else {

                $('#estval-compare-error').css('display', 'none');
                submitLoanDetailsForm();

              }

            } else if(state.chosen_loan_type == 'cashout') {

              var estVal = parseInt($('#estval').val().replace(/,/g, ''));
              var mortBal = parseInt($('#curmortgagebalance').val().replace(/,/g, ''));
              var cashout = parseInt($('#cashout').val().replace(/,/g, ''));
              var total = mortBal + cashout;

              if(estVal < total) {

                $('#estval-compare-error').text('Property value must be higher than loan amount : ' + total);
                $('#estval-compare-error').css('display', 'block');
                
                return false;

              } else {

                $('#estval-compare-error').css('display', 'none');
                submitLoanDetailsForm();

              }

            } else {
              submitLoanDetailsForm();
            }
          }
        })
        // Configure validation
        .validate({
          onkeyup: false,
          messages: {
            zipcode: {
              remote:  jQuery.validator.format("Please enter a valid Zip Code in a Newfi approved state: AZ, CA, CO, FL, NJ, PA, OR or WA")
            }
          },
          rules: {
            loantype: 'required',
            zipcode:  {
              required: true,
              zipCodeValidation: true,
              'remote':   {
                url:        API_URL_PREFIX+'states/zipCode',
                type:       'GET',
                datatype:   'text',
                data:       {zipCode: function(){return $('#zipcode').val();}},
                dataFilter: function(data, type){
                  return /Valid ZipCode/.test(data) ? 'true' : 'false';
                }

              }
            },
            residencetype: 'required',
            propertyuse:   'required',
            creditscore:   'required',
            purchaseprice: {
              required_for_purchase: true,
              currencyNumber:        true
            },
            downpaymentpercent: {
              required_for_purchase: true,
              range:                 [3, 99]
            },
            estval: {
              required_for_cashout: true,
              required_for_refi:    true,
              currencyNumber:       true
            },
            curmortgagebalance: {
              required_for_cashout: true,
              required_for_refi:    true,
              currencyNumber:       true
            },
            fha: {
              required_for_refi:    true
            },
            cashout: {
              required_for_cashout: true,
              currencyNumber:       true
            }
          }
        })
        ;

      /*
       * 4. Add handlers for dynamically generated interactive elements
       */
      $('body')
        .on( 'click', '[data-js=show-details-form]', regressToLoanDetails)
        .on( 'click', '[data-js=show-rate-details]', function(){showRateDetails(this);})
        .on( 'click', '[data-js=close-rate-details]', showRatesTable)
        .on( 'click', '[data-js=show-rate-table]', regressToRateTable)
        .on( 'click', '[data-js=select-rate]', function(){selectRate(this);})
        .on( 'click', '[data-js=trigger-tooltip]', function(event){toggleTooltips(event, this);})
        .on( 'click', '[data-js=close-tooltip]', function(event){closeTooltips()})
        .on('click', '.c-btn-terse', function(e){terseTooltips();})
        .on('click', '.close-terse-tooltip', function(e){closeterseTooltips();})
        ;
    }

    /**
     * Update UI state and manage DOM transitions when the loan type
     * has been changed.
     */
    function switchLoanTypes() {
      // record state for later use
      state.chosen_loan_type = $('input[name=loantype]:checked', dom.$loantype_radioset).val();
      toggleFieldsInLoanDetailsForm(state.chosen_loan_type);

      // Clear any error states from validation
      // dom.$loan_form.validate().resetForm();
      $('.c-form-element.c-has-error', dom.$loan_form).removeClass('c-has-error');
      $('label.c-form-element__help', dom.$loan_form).remove();

      // The first time we display the details container
      removeLoantypeIcons();
      showLoanDetailsForm();
    }

    /**
    * Helper to add/remove any tooltips from the DOM
    * @param  {element} event The event that trigggered this call
    */
   function toggleTooltips(event, el) {
     // TODO: Show/hide tooltips. pseudo-code:
     //
     // if (showing a tooltip) {
     //   renderTooltip(el)
     // } else if (clicking on an existing tooltip){
     //   return; // do nothing
     // } else {
     //   remove tooltips
     // }

     $('.c-tooltip').remove();

     var tooltip = renderTooltip(el);

     $(el).after(tooltip);

     // $('.close-tooltip').on('click', function(){
     //    closeTooltips();
     // });
     
   }
   $('.numbersOnly').keyup(function () { 
    this.value = this.value.replace(/[^0-9]/g,'');
  });
   $('.alphabetsOnly').keyup(function () { 
    this.value = this.value.replace(/[^a-zA-Z]/g,'');
  });
  
 
   $('#zipcode').on('keydown', function(e){
      // Allow: backspace, delete, tab, escape, enter and .
      if ($.inArray(e.keyCode, [46, 8, 9, 27, 13]) !== -1 ||
           // Allow: Ctrl/cmd+A
          (e.keyCode == 65 && (e.ctrlKey === true || e.metaKey === true)) ||
           // Allow: Ctrl/cmd+C
          (e.keyCode == 67 && (e.ctrlKey === true || e.metaKey === true)) ||
           // Allow: Ctrl/cmd+X
          (e.keyCode == 88 && (e.ctrlKey === true || e.metaKey === true)) ||
           // Allow: home, end, left, right
          (e.keyCode >= 35 && e.keyCode <= 39)) {
               // let it happen, don't do anything
               return;
      }
      // Ensure that it is a number and stop the keypress
      if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
          e.preventDefault();
      }
    });

   $("#zipcodeMobile").on('keydown', function(e){
      // Allow: backspace, delete, tab, escape, enter and .
      if ($.inArray(e.keyCode, [46, 8, 9, 27, 13]) !== -1 ||
           // Allow: Ctrl/cmd+A
          (e.keyCode == 65 && (e.ctrlKey === true || e.metaKey === true)) ||
           // Allow: Ctrl/cmd+C
          (e.keyCode == 67 && (e.ctrlKey === true || e.metaKey === true)) ||
           // Allow: Ctrl/cmd+X
          (e.keyCode == 88 && (e.ctrlKey === true || e.metaKey === true)) ||
           // Allow: home, end, left, right
          (e.keyCode >= 35 && e.keyCode <= 39)) {
               // let it happen, don't do anything
               return;
      }
      // Ensure that it is a number and stop the keypress
      if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
          e.preventDefault();
      }
    });

    var validateMobilezipcode=function(){
      if($('#zipcodeMobile').val()!="" && $('#zipcodeMobile').val().length==5) {
        $.ajax({
            url:        API_URL_PREFIX+'states/zipCode',
            type:       'GET',
            datatype:   'text',
            data:       {zipCode: function(){return $('#zipcodeMobile').val();}},
            success: function(data){ 
                  if(data.resultObject=="Valid ZipCode"){
                      $('.zipcode_error').css('display','none');
                      $('.zipcode_mobile').prop("disabled", false);                     
                  }else{
                      $('.zipcode_error').css('display','block');                    
                      $('.zipcode_mobile').prop("disabled", true);
                  }                   
            }
         });
      }else{
        $('.zipcode_mobile').prop("disabled", true);
        $('.zipcode_error').css('display','none');
      }
    }

    $('#zipcodeMobile').blur(validateMobilezipcode).keyup(validateMobilezipcode);
    $("#zipcodeMobile").bind('paste', function(e) {
        var ctl = $(this);
        setTimeout(function() {
            validateMobilezipcode();
        }, 100);
    });
       
   function closeTooltips() {
      $('.c-tooltip').remove();
   }

   function terseTooltips() {
    var height = $(window).height();
    console.log('ok')
    $('.terse-tooltip-container').css({'display': 'block', 'height':height+'px'});
   }

   function closeterseTooltips() {
    $('.terse-tooltip-container').css({'display': 'none'});
   }

    /**
     * Update UI state and manage DOM transitions when the rate type
     * selection has been changed.
     */
   function switchRateTypes() {
      var selected_ratetype = $('input[name=ratetype]:checked', dom.$ratetype_radioset).val();
      switch (selected_ratetype){
        case 'bestrate':
          $('.c-rates-listing__result').not('.c-rates-listing__result--lowestRate').hide();
          $('.c-rates-listing__result--lowestRate:hidden').fadeIn(200);
          break;
        case 'bestclosingcosts':
          $('.c-rates-listing__result').not('.c-rates-listing__result--lowestClosing').hide();
          $('.c-rates-listing__result--lowestClosing:hidden').fadeIn(200);
          break;
        case 'all':          
          $('.c-rates-listing__result:hidden').fadeIn(200);
          break;
      }
   	$(".previewDetails").empty();
  	$(".c-rates-listing__program_new tr").removeClass("activeRow");
  	$(".c-rates-listing__program_new").removeClass("activeTable");
    }

    /*validation for user registration form */
    function userRegistrationFormValidation() {
      userRegistrationValidator = dom.$user_registration_form.validate({
          rules: {
            fname : {
              required : true
            },
            lname : {
              required : true
            },
            email: {
              required : true,
              email : true
            },
            primaryPhone: {
              required : true,
              phoneNumberValidation : true
            },
            newfiadvisor : {
              required : true
            },
            newfiadvisorsname : {
              required : true
            }
          },
          messages: {
            fname: "Please enter your firstname",
            lname : "Please enter your lastname",
            email : "Please enter a valid email address",
            primaryPhone : "Please enter a valid primary phone",
            newfiadvisor : "Please choose newfi loan advisor",
            newfiadvisorsname : "Please enter your advisor's name"
          }
        });

      return userRegistrationValidator;
    }

    function userqueryFormValidation() {
      userQueryFormValidator = dom.$user_query_form.validate({
          rules: {
            firstname : {
              required : true
            },
            lastname : {
              required : true
            },
            emailid: {
              required : true,
              email : true
            },
            primaryPhoneId: {
              required : true,
              phoneNumberValidation: true
            }
          },
          messages: {
            firstname: "Please enter your firstname",
            lastname : "Please enter your lastname",
            emailid : "Please enter a valid email address",
            primaryPhoneId : "Please enter a valid primary phone"
          }
        });

      return userQueryFormValidator;
    }






    /**
     * Helper to remove the rates table fom the DOM
     */
    function destroyRatesTable() {
      dom.$rates_listing__wrapper.empty();
    }

    /**
     * Update UI state and manage DOM transitions when details for
     * a rate are requested.
     * @param  {element} el The element that trigggered this call
     */
   function showRateDetails(el) {
      
      var
        rateData = state.data_cache.rates.cleaned,
        program_id = $(el).parents('[data-js-program-id]').attr('data-js-program-id'),
        rate_id = $(el).parents('[data-js-rate-id]').attr('data-js-rate-id'),
        program = rateData.programs[program_id],
        rate = rateData.programs[program_id].rates[rate_id]
        ;
       	renderRateDetails(program, rate, program_id, rate_id);
	   	$(".c-rates-listing__program_new").removeClass("activeTable");
		$(".c-rates-listing__program_new tr").removeClass("activeRow");
		$(el).parent().parent().addClass("activeRow");
		$(el).parent().parent().parent().parent().addClass("activeTable");	
       	sendTrackingEvent('viewed_rate');

    }

    /**
     * Update UI state and manage DOM transitions when showing the
     * rates table
     */
    function showRatesTable() {
      var
        promise = state.data_cache.rates.response,
        loadingIndicatorPresent = $('[data-js=rates-loading-indicator]').length
        ;

      // If we're waiting on a response and haven't already, show
      // the loading animation now; otherwise render the rates table
      if (promise.state() !== 'resolved' && !loadingIndicatorPresent) {
        renderRateLoadingIndicator();
      } else {
        renderRatesTable();
      }

    }

    /**
     * Update UI state and manage DOM transitions when showing the
     * Loan Details form
     */
    function showLoanDetailsForm() {
      dom.$loan_form.show();
      dom.$loan_form__collect_details_stage.not(':visible').slideDown(300);
    }

    /**
     * Update UI state and manage DOM transitions when showing the
     * ser registration form
     */
    function showUserRegistration() {
      dom.$ratetype_form__wrapper.not(':hidden').slideUp(200);
      renderChosenRateSummary();
      dom.$user_registration__wrapper
        .css('opacity', 0)
        .slideDown(function(){
          $(this).css('opacity', '1');
        })
        ;
    }

    /**
     * Update UI state and manage DOM transitions when returning the
     * app to the state of collecting Loan Details
     */
    function regressToLoanDetails() {
      $('#basic-information').fadeIn(300);
      dom.$user_registration__wrapper
        .add(dom.$loan_summary)
        .add(dom.$ratetype_form__wrapper)
        .add(dom.$rates_listing__wrapper)
        .not(':hidden').fadeOut(300, function() {
          destroyRatesTable();
          dom.$loan_form
            .not(':visible').fadeIn(300);
        });

        if(userRegistrationValidator) {
          userRegistrationValidator.resetForm();
        }
        //adding code for diabling divs
        if(!$.isEmptyObject(mobile_data)){ 
          state = {
            'loan_advisors': null,
            'data_cache':    {
              'rates':        {
                'request':     null,
                'response':    null,
                'cleaned':     null
              }
            },
            'chosen_loan_type': null,
            'chosen_program':   null,
            'chosen_rate':      null,
            'tracking_events':         {
              'entered_loan_details': false,
              'viewed_rate':          false,
              'selected_rate':        false
            }
          };         
          $("#property_content").removeClass("active");
          $(this).closest('.subhead').removeClass('active');
          $(this).closest('.subhead').css('display','none');
          $(".mainTab").removeAttr("style","display:none");
         // $('.main_option1').css('display', 'none');
          $(".subhead step-5").removeClass("active"); 
          $('.mobile_rates-listing').css('display', 'none');
          $('.mobile_rates-listing_error').css('display', 'none'); 
          ScrollTo('home_content');       
        }     
    }

    /**
     * Update UI state and manage DOM transitions when returning the
     * app to the state of picking a rate
     */
    function regressToRateTable() {
      dom.$user_registration__wrapper
        .add(dom.$rates_listing__wrapper)
        .not(':hidden').fadeOut(300, function() {
          showRatesTable();
          dom.$ratetype_form__wrapper
            .add(dom.$rates_listing__wrapper)
            .not(':visible').fadeIn(300);
        });

        if(userRegistrationValidator) {
          userRegistrationValidator.resetForm();
        }

    }




    /**
     * Build rate loading indicator html from template; insert into
     * the DOM and show it
     */
    function renderRateLoadingIndicator() {
      var template = config.templates.rate_loading_animation;
      dom.$rates_listing__wrapper.empty().show().append(template({}));
      toggleFieldsInLoanDetailsForm(state.chosen_loan_type);

    }

    /**
     * Build rate details html from template and rate data; insert
     * into the DOM
     */
    function renderRateDetails(program, rate, program_id, rate_id) {
      var type = false;

      if(state.chosen_loan_type == "new-purchase") {
        loanType = true;
      } else {
        loanType = false;
      }

      var
        template = config.templates.rates_detail,
        context = {
          'program':    program,
          'rate':       rate,
          'program_id': program_id,
          'rate_id':    rate_id,
          'type':       type
        }
        ;

        console.log(context);
		$(".previewDetails").empty();
      $("#previewDetails" + program_id + "-" + rate_id).append(template(context));
    }

    /**
     * Build rate table html from template and rate results data;
     * insert into the DOM and show it
     */
    function renderRatesTable() {
      var
        chosen_type = state.chosen_loan_type,
        template = config.templates.rates_listing,
        context = state.data_cache.rates.cleaned,
        loadingIndicatorPresent = $('[data-js=rates-loading-indicator]').length
        ;

      if (loadingIndicatorPresent) {
        dom.$rates_listing__wrapper.fadeOut(1000, function(){
          $(this).empty().append(template(context));
          // hide rows that don't meet the currently selected rate type option before showing the table
          switchRateTypes();
          $(this).add(dom.$ratetype_form__wrapper).not(':visible').fadeIn(300);
        });
      } else {
        console.log(context)
        if(context!==null){
            if(context.programs.length > 0) {
              dom.$rates_listing__wrapper.empty().append(template(context));
              switchRateTypes();
              dom.$rates_listing__wrapper.add(dom.$ratetype_form__wrapper).not(':visible').fadeIn(300);
            } else {
              dom.$rate_list_error.fadeIn(300);
            }
          }
        
      }

      // loadQtipsTooltips();
    }

  function loadQtipsTooltips() {
      setTimeout(function(){
            // Rate Column Tooltip
            $('#rateTooltips').qtip({
            content: {
              text: 'The interest rate is the yearly rate charged by lender to a borrower in order for the borrower to obtain a loan. This is expressed as a percentage of the total amount loaned. Note that rates may increase for adjustable rate mortgages.',
              title: '',
              //button: 'Close'
            },
            style: 'qTipsCustomCss',
            position: {
              my: 'top center',  // Position my top left...
              at: 'bottom center', // at the bottom right of...
              target: this // my target
            }
          });

          // APR Column Tooltip
          $('#aprTooltips').qtip({
            content: {
              text: 'Annual percentage rate (APR) is the cost of credit expressed as a yearly rate. The APR includes the interest rate, points, lender fees, and certain other financing charges the borrower is required to pay.',
              title: '',
              //button: 'Close'
            },
            style: 'qTipsCustomCss',
            position: {
              my: 'top center',  // Position my top left...
              at: 'bottom center', // at the bottom right of...
              target: this // my target
            }
          });

          // Monthly Payemnt Column Tooltip
          $('#paymentTooltips').qtip({
            content: {
              text: 'This is the estimated monthly mortgage payment for principal and interest only. This does not include property taxes, homeowner\'s insurance, or mortgage insurance (if applicable), which could increase your monthly payment.',
              title: '',
              //button: 'Close'
            },
            style: 'qTipsCustomCss',
            position: {
              my: 'top center',  // Position my top left...
              at: 'bottom center', // at the bottom right of...
              target: this // my target
            }
          });

          $('#closingTooltips').qtip({
            content: {
              text: 'Click on the Details button for detailed split of the total estimated closing closts',
              title: '',
              //button: 'Close'
            },
            style: 'qTipsCustomCss',
            position: {
              my: 'top center',  // Position my top left...
              at: 'bottom center', // at the bottom right of...
              target: this // my target
            }
          });

        }, 2000);
    }

    /**
     * Build Loan Details Summary html from template and form input;
     * insert into the DOM
     */
    function renderDetailsSummary() {
      var
        chosen_type = state.chosen_loan_type,
        fields_to_summarize = config.loantypes[chosen_type].fields,
        template = config.templates.details_summary,
        context = {'rows': []},
        inputsToFormatAsCurrency = [
          'purchaseprice',
          'estval',
          'curmortgagebalance',
          'cashout'
        ]
        ;

      $('#primaryPhoneId').mask('(000) 000-0000');
      $('#primaryPhone').mask('(000) 000-0000');

      context.rows.push({'label': 'Loan Type', 'value': dict.loantype_labels[chosen_type]});
       // Iterate through fields and populate context object for summary template
      if($.isEmptyObject(mobile_data)){
              $.each(fields_to_summarize, function(i, field) {
              var
                label = dict.field_summary_labels[field],
                el = document.getElementById(field),
                value
                ;
              if(label=="Est. Credit Score"){
                  value=$("#chanceSlider").text();
              }else{
                switch (el.tagName) {
                  case 'INPUT' :
                    value = (el.hasOwnProperty('calculatedValue')) ? el.calculatedValue : el.value;
                    break;
                  case 'SELECT' :
                    value = el.options[el.selectedIndex].text;
                    break;
                  default:
                    value = 'Cannot parse value for this input type';
                }
                if ($.inArray(el.name, inputsToFormatAsCurrency) >= 0) {
                value = accounting.formatMoney(value, {precision: 0});
              }
            }

              

              context.rows.push({'label': label, 'value': value});
            });
        }else{
            $.each(fields_to_summarize, function(i, field) {
              
                var
                label = dict.field_summary_labels[field],
                el = document.getElementById(field),
                value
                ;
                if(field=="residencetype" || field=="propertyuse" || field=="creditscore" || field=="downpaymentpercent" || field=="fha"){
                    var fieldname=field+"_text";
                    value=mobile_data[fieldname];
                }else{
                    value=mobile_data[field];
                }
                if ($.inArray(field, inputsToFormatAsCurrency) >= 0) {
                  value = accounting.formatMoney(value, {precision: 0});
                }  
                context.rows.push({'label': label, 'value': value});

               
            });
        }

      // Iterate through fields and populate context object for summary template
      

      dom.$loan_form__details_summary_injectionpoint.empty().append(template(context));
    }

    /**
     * Build Rate Summary html from template and selected rate data;
     * insert into the DOM and show
     */
    function renderChosenRateSummary() {
      var
        chosen_program = state.chosen_program,
        chosen_rate = state.chosen_rate,
        template = config.templates.chosen_rate_summary
        ;

      var context = {'rate': chosen_rate, 'program': chosen_program};

      dom.$rates_listing__wrapper.fadeOut(200, function(){
        $(this).empty().append(template(context)).fadeIn(300);
      });
    }


    /**
    * Build a Tooltip's html from template and passed triggering element;
    * insert into the DOM and show
    * @param  {element} el The element that trigggered this call
    */
   function renderTooltip(el) {
     var
       template = config.templates.tooltip,
       context = {},
       $trigger = $(el),
       offset,
       tooltip,
       html
       ;

     // Get the tooltip text from the triggering element's attribute
     html = dict.tooltips[$trigger.attr('data-tooltip-name')];

     // Make sure we have some tooltip text to show
     if (typeof html !== 'undefined') {
       // Build the data to be passsed to the template
       context = {'html': html};
       // Create and return the tooltip dom element
       return $(template(context));
     }
   }




    /**
     * Piece together a JSON object from our loan details form that is
     * compatible with the Newfi REST API
     * @return {json object} A JSON object suitable for posting to
     *     teaserRates REST API.
     */
    function buildRatesDataRequestObj() {
      if($.isEmptyObject(mobile_data)){
        var
          // Shortcut to the chosen loan type
          chosen_type = state.chosen_loan_type,
          // Prepare values to add to return object
          v = {
            residencetype:      $('#residencetype').val(),
            propertyuse:        $('#propertyuse').val(),
            creditscore:        $("#chanceSlider").text(),
            fha:                $('#fha').val(),
            zipcode:            $('#zipcode').val(),
            purchaseprice:      accounting.unformat($('#purchaseprice').val()),
            downpaymentpercent: accounting.unformat($('#downpaymentpercent').val()),
            estval:             accounting.unformat($('#estval').val()),
            curmortgagebalance: accounting.unformat($('#curmortgagebalance').val()),
            cashout:            accounting.unformat($('#cashout').val()),
            curmortgagepayment: null, // see note above
          };
        }else{
          var
          // Shortcut to the chosen loan type
          chosen_type = state.chosen_loan_type,
          // Prepare values to add to return object
           v = {
              residencetype:      mobile_data.residencetype,
              residencetype_text: mobile_data.residencetype_text,
              propertyuse:        mobile_data.propertyuse,
              propertyuse_text:   mobile_data.propertyuse_text,
              creditscore:        mobile_data.creditscore,
              creditscore_text:   mobile_data.creditscore_text,
              fha:                mobile_data.fha,
              fha_text:           mobile_data.fha_text,
              zipcode:            mobile_data.zipcode,
              purchaseprice:      mobile_data.purchaseprice,
              downpaymentpercent: mobile_data.downpayment,
              estval:             accounting.unformat(mobile_data.estval),
              curmortgagebalance: accounting.unformat(mobile_data.curmortgagebalance),
              cashout:            accounting.unformat(mobile_data.cashout),
              curmortgagepayment: null, // see note above
              downpaymentpercent_text:mobile_data.downpaymentpercent_text,
            };

        }
       // DRY: calculate downpayment in dollars
      v.downpaymentdollars   = v.purchaseprice * v.downpaymentpercent / 100;

      // Return an object suitable for the chosen loan type
      switch (chosen_type) {
        case 'new-purchase':
          return {
            'loanType':        'PUR',
            'purchaseDetails': {
              'livingSituation': 'homeOwner',
              'housePrice':      v.purchaseprice,
              'loanAmount':      v.purchaseprice - v.downpaymentdollars,
              'zipCode':         v.zipcode
            },
            'livingSituation':        'renting',
            'homeWorthToday':         v.purchaseprice,
            'currentMortgageBalance': v.downpaymentdollars,
            'loanAmount':             v.purchaseprice - v.downpaymentdollars,
            'propertyType':           v.residencetype,
            'residenceType':          v.propertyuse,
            'zipCode':                v.zipcode,
            'creditscore':            v.creditscore
          };
          break;

        case 'refinance':
          return {
            'loanType':               'REF',
            'refinanceOption':        'REFLMP',
            'currentMortgageBalance': v.curmortgagebalance,
            'loanAmount':             v.curmortgagebalance,
            'subordinateFinancing':   null,
            'currentMortgagePayment': v.curmortgagepayment,
            'isIncludeTaxes':         null,
            'impounds':               'YES',
            //'propTaxMonthlyOryearly': 'Year',
            //'propInsMonthlyOryearly': 'Year',
            'homeWorthToday':         v.estval,
            'propertyType':           v.residencetype,
            'residenceType':          v.propertyuse,
            'zipCode':                v.zipcode,
            'productType':            v.fha,
            'creditscore':            v.creditscore
          };
          break;

        case 'cashout':
          return {
            'loanType':               'REF',
            'refinanceOption':        'REFCO',
            'cashTakeOut':            v.cashout,
            'currentMortgageBalance': v.curmortgagebalance,
            'loanAmount':             v.cashout + v.curmortgagebalance,
            'subordinateFinancing':   null,
            'currentMortgagePayment': v.curmortgagepayment,
            'isIncludeTaxes':         null,
            'impounds':               'YES',
           // 'propTaxMonthlyOryearly': 'Year',
            //'propInsMonthlyOryearly': 'Year',
            'homeWorthToday':         v.estval,
            'propertyType':           v.residencetype,
            'residenceType':          v.propertyuse,
            'zipCode':                v.zipcode,
            'creditscore':            v.creditscore
          };
          break;
      }
    }

    /**
     * Wrapper around the XHR request for rates data from teaserRates
     * API, to handle failed requests and caching valid responses.
     * @return {[jqXHR object]} deferred object, or recursive call
     */
    function getRatesData(attempt) {
      var
        cache = state.data_cache.rates,
        fresh_request = buildRatesDataRequestObj();
      
      // Avoid calling the API if we already queried it recently with identical paramaters
      if (attempt > 4) {
        // Abort if we've tried getting data too many times.
        // TODO: Inidication to the user that somthing went wrong.
        return;
      } else if (cache.response !== null && _.isEqual(cache.request, fresh_request) ) {
        // We have a cached deferred object; leave it alone
        $('#basic-information').fadeOut(300);
        return;
      } else {
        // Save our request to compare against next tme rates data is requested
        cache.request = fresh_request;
        // Get remote data
        cache.response = getTeaserRateFromRemote(fresh_request);
        // Parse remote data immediately, so it's available for subsequent actions
        cache.response
          .done(function(data){
            if(data!=""){
              cache.cleaned = tranformRatesData(JSON.parse(data));
              console.log(cache.cleaned);

            // Wait to render rates table when we hav valid data

              if(cache.cleaned.programs.length > 0) {
                dom.$rate_list_error.fadeOut(300);
                renderRatesTable();
              } else {
                console.log('no data fetched from the server for this query...........');
                renderError();
              }
            }
            
          })
          .fail(function(){
            // Clear cache and try again
            cache.response = null;
            getRatesData(++attempt);
          })
          ;
      }
    }

    /**
    *Renders error message if data not fetched for a particular query
    **/

    function renderError() {
      var loadingIndicatorPresent = $('[data-js=rates-loading-indicator]').length;

      if (loadingIndicatorPresent) {
        dom.$ratetype_form__wrapper.fadeOut();
        dom.$rates_listing__wrapper.fadeOut();
        dom.$rate_list_error.fadeIn(300);
      }

    }

    /**
     * Request rate details from the Newfi REST API
     * @return  {jqXHR object}  The Ajax call's Promise object
     */
    function getTeaserRateFromRemote(request_obj) {
      console.log(request_obj);
      return $.ajax({
        url:      API_URL_PREFIX+'calculator/findteaseratevalue',
        type:     'POST',
        data:     {'teaseRate':  JSON.stringify(request_obj)},
        datatype: 'application/json',
        cache:    false
      });
    }

    /**
     * Get a list of advisors from the Newfi REST API; parse the
     * response and store ehatwe require in a cache
     */
    function populateLoanAdvisorListFromRemote() {
      jQuery.ajax({
        url:      '/NewfiWeb/rest/shopper/lasearch',
        type:     'GET',
        datatype: 'application/json',
        data:     request_obj,
        success:  function(response) {
          if (response.error === null && response.resultObject !== undefined){
            // Empty the loan_advisors list if it already exists
            loan_advisors = [];

            // Populate the list from server response
            for (var i=0; i<response.resultObject.length; i++) {
              var advisor = loanAdvisorObjList[i];

              // Only keep what data we need to autocomplete our form field
              loan_advisors.push({
                'name':  advisor.displayName,
                'email': advisor.emailId
              });
            }
          }
        }
        // Do nothing on error; users just won't see an autocomplete list
      });
    }

    /**
     * Record the selection of a rate; trigger the user
     * registration form to show
     * @param  {element} el The element that trigggered this call
     */
    function selectRate(el) {
      var
        rateData = state.data_cache.rates.cleaned,
        program_id = $(el).attr('data-js-program-id'),
        rate_id = $(el).attr('data-js-rate-id'),
        program = rateData.programs[program_id],
        rate = rateData.programs[program_id].rates[rate_id]
        ;
        $('#createAccSubmit').attr('value', 'Create Account');
        $('#createAccSubmit').attr("disabled",false);
        $('#createAccSubmit').css({"background-color":"#FD8A10"});
      // record chosen rate and program
      state.chosen_rate = rate;
      state.chosen_program = program;

      showUserRegistration();
      sendTrackingEvent('selected_rate');
    }

    /**
     * Handle Loan Details Form submission.
     */
    function submitLoanDetailsForm() {
      // Build and show summary of details (and hide details form)
      renderDetailsSummary();
      if($.isEmptyObject( mobile_data)){
        dom.$loan_form.slideUp(300).fadeOut(100);
        dom.$loan_summary.slideDown(300);
        dom.$ratetype_form__wrapper.slideDown(300);
      }

      // Request rates data and rendering of data when we recceive it
      getRatesData(1);
      showRatesTable();

      sendTrackingEvent('entered_loan_details');
    }

    /* Handle Newfi Advisor */

    function getNewfiAdvisors() {
      $('input[name=newfiadvisor]').on('change', function() {
        if(!lasearch) {
          lasearch = true;
          $.ajax({
            url : API_URL_PREFIX+"shopper/lasearch",
            method : "GET",
            datatype: "application/json",
            success : function(response) {
              loanAdvisorListCallBack(response);
              autoFillNewfiAdvisors();
            }
          })
        }
      });
    }


    function autoFillNewfiAdvisors() {
      // console.log(loanAdvisorMap)
      $('input[name=newfiadvisorsname]').autocomplete({
        source: loanAdvisorList,
        select: function (event, ui) {
          if(ui.item.value != "" && ui.item.value != undefined) {
            for(var i=0; i < loanAdvisorMap.length; i++) {
              if(loanAdvisorMap[i].name == ui.item.value) {
                $(this).data('email',loanAdvisorMap[i].email);
                break;
              }
            }
          }
        }
      });
    }

    /**
     * Handle user registration form submission
     */
    function submitUserRegistration(user_data) {

      var requestData = buildUserRegistrationData();

      var loanManagerEmail = $('#newfiadvisorsname').data('email');

      if(loanManagerEmail != "" && loanManagerEmail != undefined) {
        requestData.loanManagerEmail = loanManagerEmail;
      }

      console.log(requestData);
      //Validates user exists in database or not
      var validateUser = validateUserDetails(requestData);

    }

    /*****
      Handle user query form submission, 
      for user entered information 
      there is no quotation means, 
      user can send the query form submission 
    *****/

    function submitUserQuery(query_obj) {
      var user_query = {};

      user_query.firstName = $('#firstname').val();
      user_query.lastName = $('#lastname').val();
      user_query.emailId = $('#emailid').val() + ":" + new Date().getTimezoneOffset();
      user_query.phoneNumber = $('#primaryPhoneId').val().replace(/[()$,\s-]/g, '').trim();

      // var requestData = buildUserRegistrationData();
      // var validateUser = validateUserDetails(requestData);

      $.ajax({
        url: API_URL_PREFIX+'shopper/record',
        method: 'POST',
        dataType: 'text',
        data: {'registrationDetails' : JSON.stringify(user_query)},
        success: function(data, textStatus, xhr){
          console.log(xhr.status);
          if(xhr.status == 200) {
            Cookies.set("query_page", "query_success");
            window.location.href = "thankYouPage.html";
          }
        }

      });
    }

    function buildUserRegistrationData() {
      var cache = state.data_cache.rates.request;
      var
        // Shortcut to the chosen loan type
        chosen_type = state.chosen_loan_type,
        // Prepare values to add to return object
        v = {
          'firstName' : $('#fname').val(),
          'lastName' : $('#lname').val(),
          'emailId' : $('#email').val() + ":" + new Date().getTimezoneOffset(),
          'phoneNumber' : $('#primaryPhone').val().replace(/[()$,\s-]/g, '').trim()
        };

      // Return an object suitable for the chosen loan type
      switch (chosen_type) {
        case 'new-purchase':
          return {
            'loanType': {
              "loanTypeCd": "PUR"
            },
            'monthlyRent' : '',
            'purchaseDetails': {
              'livingSituation': 'renting',
              'housePrice':      cache.purchaseDetails.housePrice,
              'loanAmount':      cache.purchaseDetails.loanAmount,
              'buyhomeZipPri':   cache.purchaseDetails.zipCode
            },
            "propertyTypeMaster": {
              'propertyTypeCd': cache.propertyType,
              'residenceTypeCd': cache.residenceType,
              'homeZipCode': cache.zipCode
            },
            'loanAmount':             cache.loanAmount,
            'user' : {
              'firstName': v.firstName,
              'lastName': v.lastName,
              'emailId': v.emailId,
              'phoneNumber' : v.phoneNumber
            }
          };
          break;

        case 'refinance':
          return {
            'loanType':               {
                "loanTypeCd": "REF"
              },
              "refinancedetails": {
                "refinanceOption": "REFLMP",
                "currentMortgageBalance": cache.currentMortgageBalance,
                "includeTaxes": cache.isIncludeTaxes
              },
              "propertyTypeMaster": {
            		"homeWorthToday": cache.homeWorthToday,
            		"homeZipCode": cache.zipCode,
            		//"propTaxMonthlyOryearly": cache.propTaxMonthlyOryearly,
            		//"propInsMonthlyOryearly": cache.propInsMonthlyOryearly,
            		"propertyTypeCd": cache.propertyType,
            		"residenceTypeCd": cache.residenceType
            	},
            'loanAmount': cache.loanAmount,
            'user' : {
              'firstName': v.firstName,
              'lastName': v.lastName,
              'emailId': v.emailId,
              'phoneNumber' : v.phoneNumber
            }
          };
          break;

        case 'cashout':
          return {
            'loanType':               {
                "loanTypeCd": "REF"
              },
              "refinancedetails": {
                "refinanceOption": "REFCO",
                "cashTakeOut": cache.cashTakeOut,
                "currentMortgageBalance": cache.currentMortgageBalance,
                "includeTaxes": cache.isIncludeTaxes
              },
              "propertyTypeMaster": {
            		"homeWorthToday": cache.homeWorthToday,
            		"homeZipCode": cache.zipCode,
            		//"propTaxMonthlyOryearly": cache.propTaxMonthlyOryearly,
            		//"propInsMonthlyOryearly": cache.propInsMonthlyOryearly,
            		"propertyTypeCd": cache.propertyType,
            		"residenceTypeCd": cache.residenceType
            	},
            'loanAmount': cache.loanAmount,
            'user' : {
              'firstName': v.firstName,
              'lastName': v.lastName,
              'emailId': v.emailId,
              'phoneNumber' : v.phoneNumber
            }
          };
          break;
      }

    }


    function validateUserDetails(request_data) {
      $.ajax({
        url : API_URL_PREFIX+'shopper/validate',
        type : 'POST',
        dataType : 'text',
        data : {'registrationDetails' : JSON.stringify(request_data)},
        success : function(response) {
          var result = JSON.parse(response);
          console.log(result);
          if(result.resultObject) {
            console.log('validation success');
            $('.user-registration-error').hide();
            //Final user data submission with teaserRate data
            $('#createAccSubmit').attr('value', 'Creating Account...');
            $('#createAccSubmit').attr("disabled",true);
           $('#createAccSubmit').css({"background-color":"#d3d3d3"});
           createUserAccount(request_data);

          }

          if(result.error) {
            if(result.error.message != "" && result.error.message != undefined) {
              $('.user-registration-error').show();
              $('#registration-error').text(result.error.message);
            }
          }
        },
        error: function (xhr) {
          console.log(xhr);
        }
      });

    }

    function createUserAccount(registration_details) {
      var teaserRate = [state.chosen_rate.teaserRate];
      var teaseRateReqObj = buildRatesDataRequestObj();

      console.log("1 " +teaserRate);

      if (teaserRate && teaserRate[0]) {
        teaserRate[0].closingCost = state.chosen_rate.total_closing_costs.toString();;
        teaserRate[0].payment = state.chosen_rate.mo_mortgage.toString();;
        _.merge(teaserRate[0], teaseRateReqObj);        
      }      

      $.ajax({
        url : API_URL_PREFIX+'shopper/registration',
        type : 'POST',
        dataType : 'text',
        data : {'registrationDetails' : JSON.stringify(registration_details), 'teaseRateData' : JSON.stringify(teaserRate)},
        success : function(response) {
          console.log(response);

          // Redirect to Thank You Page
          if(registration_details && registration_details.user) {              
              Cookies.set('registration_email', registration_details.user.emailId.split(":")[0]);
              window.location.href = "thankYouPage.html";
          }

        },
        error: function (xhr) {
          console.log(xhr);
        }

      });
    }

    function loanAdvisorListCallBack(response) {
      var response = JSON.parse(response);
      if(response.error == null){
        var loanAdvisorObjList = response.resultObject;

        if(loanAdvisorObjList != undefined) {
          for(var i=0; i<loanAdvisorObjList.length; i++) {
            loanAdvisorList.push(loanAdvisorObjList[i].displayName);
            loanAdvisorMap.push({
              name : loanAdvisorObjList[i].displayName,
              email : loanAdvisorObjList[i].emailId
            });
          }
        }
      }
    }




    /**
     * Helper to add custom validators to jQuery.validate plugin.
     */
    function addCustomFormFieldValidators() {
      $.validator.addMethod('required_for_purchase', function(value, element) {
        if (state.chosen_loan_type !== 'new-purchase') {return true;}
        return  element !== '';
      }, 'This field is required');

      $.validator.addMethod('required_for_refi', function(value, element) {
        if (state.chosen_loan_type !== 'refinance') {return true;}
        return  element !== '';
      }, 'This field is required');

      $.validator.addMethod('required_for_cashout', function(value, element) {
        if (state.chosen_loan_type !== 'cashout') {return true;}
        return  element !== '';
      }, 'This field is required');

      $.validator.addMethod('currencyNumber', function(value, element) {
        if(element.name == "curmortgagebalance" && state.chosen_loan_type == "cashout" && value == undefined || value == "") { 
          return false;
        } 
        
        value = accounting.unformat(value);
        if (element.name == "curmortgagebalance" && state.chosen_loan_type == "cashout") {
          return true;
        } else {
          return !isNaN(value) && value * 1 > 0;  
        }        
      }, 'This field is required');

      $.validator.addMethod('zipCodeValidation', function(value, element) {
        if(isNaN(value)) {
          return false;
        } else {
          return true;
        }
      }, 'Please enter a valid Zip Code in a Newfi approved state: AZ, CA, CO, FL, NJ, PA, OR or WA');

      $.validator.addMethod('phoneNumberValidation', function(value, element) {
        var val = value ? value.replace(/[()$,\s-]/g, '').trim() : "";
        if(isNaN(val)) {
          return false;
        } else { 
          if (val.length == 10) {
            return true;  
          } else {
            false;
          }          
        }
      }, 'Please enter a valid primary phone.');      
    }

    /**
     * Helper to get a property value as a float from any object that has
     * properties with currency-formatedd values.
     * @param  {object} obj          The javascript object to pull a property
     * @param  {string} prop         Value from Property name.
     * @param  {float}  defaultValue Used if the property doesn't exist or
     *     can't be formated as a float.
     * @return {float} The value of the requested property, as a float.
     */
    function propValueOrDefault(obj, prop, defaultValue) {
      var val = defaultValue;
      if (_.has(obj, prop)) {
        // Strip currency formatting
        val = accounting.unformat(obj[prop]);
        // Revert to default if we don'thave a valid number
        if (isNaN(val)) {val = defaultValue;}
      }
      return _.round(1 * val, 0);
    }

    /**
     * Helper to sum "other" third-party fees from a raw API's rate object
     * @param  {object} raw_rateObj  An individual rate object, as returned by the
     *     REST API. (a member of a program's rateVO array)
     * @return {float}  The sum of requested values
     */
    function sumOtherThirdPartyFees(raw_rateObj) {
      var sum = 0;

      _.each(['creditReport805', 'floodCertification807', 'wireFee812'], function(key){
        sum += propValueOrDefault(raw_rateObj, key, 0.0);
      });
      // sum += propValueOrDefault(raw_rateObj, 'recordingFees1202', 87.0);

      return sum;
    }

    /**
     * Helper to remove cosmetic icon flourishes present on
     * initial UI state.
     */
    function removeLoantypeIcons() {
      // TODO: add icon elements and styling
    }

    /**
     * Helper to send events to Analytics platform
     * @param  {string} tracking_event   The name of the event to send
     * @param  {bool} one_time           Whether this event should be tracked once
     *                                   or repeatedly. defaults to true
     */
    function sendTrackingEvent(tracking_event, one_time) {
      // set default param values
      one_time = (typeof one_time === 'undefined') ? true: one_time;

      // abort if we don't have a trackign object
      if (typeof ga == 'undefined') {
        return;
      }

      var dictObj = {
          'entered_loan_details': {'category': 'Rate Quote', 'action': 'Entered Loan Details'},
          'viewed_rate':          {'category': 'Rate Quote', 'action': 'Viewed Rate Details'},
          'selected_rate':        {'category': 'Rate Quote', 'action': 'Selected a Rate'}
        }

      var stateObj =  {
          'entered_loan_details': false,
          'viewed_rate':          false,
          'selected_rate':        false
        }

      // Send a generic event if we don't have explicit details and state stored
      if (
        typeof dictObj[tracking_event] !== 'undefined' &&
        typeof stateObj[tracking_event] !== 'undefined')
      {
        ga('send', {
          'hitType':       'event',
          'eventCategory': 'Generic Event',
          'eventAction':   tracking_event
        });

      // Otherwise get data from dict and set state appropriately
      } else {
        var
          fields = dictObj[tracking_event],
          state  = stateObj[tracking_event]
          ;
        if (one_time && state === false ) {
          ga('send', {
            'hitType':       'event',
            'eventCategory': fields.category,
            'eventAction':   fields.event
          });
          state = true;
        }
      }
    }

    /**
     * Helper to manage visibility of Newfi Loan Advisor question
     * in user registration form.
     */
    function toggleAdvisorInput() {
      var
        radio      = $('input[name=newfiadvisor]:checked', dom.$user_registration_form),
        name_input = $('#newfiadvisorsname').parents('.c-form-element')
        ;

      if (radio.length === 0) {
        name_input.not('hidden').hide();
      } else if (radio.val() === 'yes') {
        name_input.not('visible').fadeIn(300);
      } else {
        name_input.not('hidden').fadeOut(300);
      }
    }

    /**
     * Helper to manage visibility of required frm elements for
     * a particular Loan type
     * @param  {string} chosen_type Must match one of the values
     *     in config.loantypes
     */
    function toggleFieldsInLoanDetailsForm(chosen_type){
      // Build collections of field elements that should be hidden and visible for the chosen loan type
      var
        visible_fields_selector = $.map(config.loantypes[chosen_type].fields, function(field) {
          return '[data-js=details--'+field+']';
        }).join(','),
        $visible_fields = $(visible_fields_selector),
        $hidden_fields = $('[data-js^=details--]', dom.$loan_form__collect_details_stage).not($visible_fields)
        ;

      // Refine collections to exclude elements already in correct state
      var $fields_to_hide = $hidden_fields.not(':hidden');
      var $fields_to_show = $visible_fields.not(':visible');

      if ($fields_to_hide.length === 0) {
        // If there are no fields to hide, show visible fields immediately
        $fields_to_show.fadeIn(300);
      } else {
        // Otherwise, hide fields first...
        $fields_to_hide.fadeOut( 100, function() {
          // ... and show fields after that animation completes.
          $fields_to_show.fadeIn(300);
        });
      }

    }

    /**
     * Transform raw rates API response into a structure more suitable to
     * our purposes.
     * @return {object} Array of Programs with indiviual rates as children
     */
    function tranformRatesData(result_obj) {
      // Create a container for our transformed set.
      var programs = [];

      // The top-level of the API's result object is a list of Programs.
      _.forEach(result_obj, function(raw_program, raw_program_index) {

        // Add the Program to our container, including only the properties we want to keep
        var program ={
          'name':         raw_program.displayName.trim(),
          'product_type': raw_program.productType.trim(),
          'rates':        []
        };
        program.display_name = program.name + program.product_type;
        programs.push(program);

        // As we iterate through this program's set of rates, we want to keep track of
        // lowest values, so we can come back and add those states to the rate objects
        // afer the loop.
        var lowest_rate_index = 0;
        var lowest_closing_index = 0;
        var lowest_closing_value = undefined;
        var lowest_points_index = 0;

        // Iterate over the program's rates in the raw result object.
        _.forEach(raw_program.rateVO, function(raw_rate, raw_rate_index) {
          /**
           * TODO: Ensure data shown in rates tables and details views is
           * accurate. See following note for details.
           *
           * NOTE: [Jade Orchard, 2017-01-12] We did our best within our
           * prototyping budget to study and refactor code from the existing
           * customer portal to ensure we're meeting functional requirements,
           * but may have missed somthing. The one obvious detrimental change is
           * that we're no longer using the variables and functions defined in
           * common.js, which is clearly shared amongst multiple separate
           * monolithic scripts for different pieces of the application.
           * However, given the interdependent, undocumnted and chaotic nature
           * of the code present in common.js and attendant script files, we
           * didn't feel it prudent to try and incorporate that code here.
          */

          // Build our transformed rate object
          var rate = {
            // 'valueSet':            raw_rate, // leaving here in case we really need original request included

            'tags':                [],
            'rate':                _.round(raw_rate.teaserRate, 3),
            'apr':                 _.round(raw_rate.APR, 3),
            'points':              _.round(raw_rate.point, 3),
            'mo_mortgage':         _.round(accounting.unformat(raw_rate.payment), 0),

            'lender_costs': { // Total Est Lender Costs
              'lender_fee':              propValueOrDefault(raw_rate, 'lenderFee813', 0),
              'application_fee':         propValueOrDefault(raw_rate, 'applicationFee', 0),
              'loanee_cost':             propValueOrDefault(raw_rate, 'creditOrCharge802', 0),
            },

            'third_party_costs': {
              'appraisal_fee':           propValueOrDefault(raw_rate, 'appraisalFee804', 0),
              'owners_title_ins':        propValueOrDefault(raw_rate, 'ownersTitleInsurance1103', 0),
              'city_county_tax':         propValueOrDefault(raw_rate, 'cityCountyTaxStamps1204', 0),
              'lenders_title_ins':       propValueOrDefault(raw_rate, 'lendersTitleInsurance1104', 0),
              'closing_and_escrow_fees': propValueOrDefault(raw_rate, 'closingEscrowFee1102', 0),
              'recording_fees':          propValueOrDefault(raw_rate, 'recordingFees1202', 0), 
              'notaryfee1110':           notaryfeeLQB,
              'other_fees':              sumOtherThirdPartyFees(raw_rate)
            },

            'prepaids': {
              'interest':               propValueOrDefault(raw_rate, 'interest901', 0),
              'homeowners_ins':         propValueOrDefault(raw_rate, 'hazIns903', 0),
              'tax_reserve':            propValueOrDefault(raw_rate, 'taxResrv1004', 0),
              'homeowners_ins_reserve': propValueOrDefault(raw_rate, 'hazInsReserve1002', 0),
            },
            'teaserRate': raw_rate
          };

          rate.total_closing_costs = _.round(
              _.sum(_.values(rate.lender_costs))
            + _.sum(_.values(rate.third_party_costs))
            , 0);

            if(rate.total_closing_costs < 0) {
                rate.total_closing_costs = 0;
            }

          rate.total_prepaids = _.round(
            _.sum(_.values(rate.prepaids))
            , 0);


          if(state.chosen_loan_type == 'refinance' || state.chosen_loan_type == 'cashout') {
            rate.third_party_costs.owners_title_ins = 0;
          }

          var lowest_closing = rate.total_closing_costs;

          if (lowest_closing >= 0) {
            if (lowest_closing_value == undefined) {
              lowest_closing_value = lowest_closing;
              lowest_closing_index = raw_rate_index;
            } else {
              if (lowest_closing <= lowest_closing_value){
                  lowest_closing_value = lowest_closing;   
                  lowest_closing_index = raw_rate_index;
              }
            }  
          }

          // if ( lowest_closing == 0){
          //   lowest_closing_index = raw_rate_index;
          // }

          /**
           *
           * In previous portal, the following function adds a preset $25 fee to the
           * result object returned by API:
           *  setNotaryFeeInClosingCostHolder(rate);
           *
           * Don't kow why this is needed, but leaving it here in case it is...
           *
           * Refactored code follows if needed: (requires adding the `valueset`
           * property to rate object above)
          */
          // rate.valueset.notaryfee1110 = '$25.00';

          /**
           * In previous portal, the following function adds properties to the
           * new rate object, to be used with the registration form:
           *  initialiseClosingCostHolderObjectWithFormInput(rate, inputFormOb);
           *  
           * I think this an be moved to the registration form itself; no other
           * need for these fields here.
           *
           * refactored code follows if needed:
           */
          // rate.loanType = state.chosen_loan_type;
          // rate.housePrice = (state.chosen_loan_type === 'new-purchase') ?
          //   state.data_cache.rates.request.purchaseDetails.housePrice :
          //   state.data_cache.rates.request.homeWorthToday;

          program.rates.push(rate);

          // Compare values against current lowest; don't run comparison on first item
          if (raw_rate_index > 0) {
            var
              lowest_points  = Math.abs(program.rates[lowest_points_index].points),
              this_points    = Math.abs(rate.points),
              lowest_rate    = program.rates[lowest_rate_index].rate,
              this_rate      = rate.rate
              ;
              // lowest_closing = program.rates[lowest_closing_index].total_closing_costs,
              // this_closing   = rate.total_closing_costs

            if (lowest_points > this_points){
              lowest_points_index = raw_rate_index;
            }

            if ( lowest_rate > this_rate){
              lowest_rate_index = raw_rate_index;
            }
          }

        });
        
        program.rates[lowest_rate_index].tags.push('lowestRate');
        program.rates[lowest_closing_index].tags.push('lowestClosing');
        program.rates[lowest_points_index].tags.push('lowestPoints');

      });

      for(var i = programs.length-1; i >= 0; i--) {
        if(programs[i].product_type != "NONCONFORMING") {
          programs.product_type = 'removeNonCon';
          break;
        }
      }
    
      for(var j = programs.length-1; j >= 0; j--) {
        if(programs.product_type == 'removeNonCon') {
          if(programs[j].product_type == "NONCONFORMING") {
            programs.splice(j, 1);
          }
        }
      } 

      // Sort programs into preferred order
      programs = _.sortBy(programs, [function(o) {
        var
          i_name = config.program_name_sort[o.name],
          i_program = config.program_product_sort[o.product_type]
          ;
        return (isNaN(i_name) || isNaN(i_program)) ? '9999999' : i_name + i_program;
      }]);
      
      if(programs.product_type) {
        delete programs['product_type'];
      }

      // Display a maximum of 4 rates that are above lowest closing cost 
      for (var i = 0; i < programs.length; i++) {

        // Sort data base on rate befor removing duplicate
        var sortedData_befor_duplicate = _.sortBy(programs[i].rates, function(o) {
          return o.rate;
        });

        // Remove duplicate record
        var non_duplidated_data = _.uniqBy(sortedData_befor_duplicate, 'total_closing_costs');
        
        // Sort data base on rate in descending order 
        var sortedData = _.sortBy(non_duplidated_data, function(o) {
          return -o.rate;
        });

        var startIndexOfSlice = 0;

        // Find 0 closing cost index and removed top of zero closing cost record
        var indexOfZero = _.findIndex(sortedData, function(o) { 
          return o.total_closing_costs == 0; 
        });

        if (indexOfZero > 0) {
          startIndexOfSlice = indexOfZero;
        }

        // Slice data and take 4 records
        var resutls = _.slice(sortedData, [start=startIndexOfSlice], [end=startIndexOfSlice+4])        

        if (resutls && resutls.length > 0) {
          // Remove lowestClosing or lowestRate tag if exist in results
          _.forEach(resutls, function(resutls_data, resutls_index) { 
            if (resutls_data.tags && resutls_data.tags.length > 0) {
              _.remove(resutls_data.tags);
            }
          })

          // Sort by closing cost to find lowest closing cost
          var sortedByClosingCost = _.sortBy(resutls, function(o) {
           return o.total_closing_costs;
          });
          sortedByClosingCost[0].tags.push('lowestClosing');

          // Sort by rate to find lowest rate 
          var sortedByRate = _.sortBy(sortedByClosingCost, function(o) {
            return -o.rate;
          });
          sortedByRate[sortedByRate.length - 1].tags.push('lowestRate');

          programs[i].rates = sortedByRate;  
       }          
      }

      // Add index properties to programs and rates, to be used in templates
      return {'programs': programs};
    }
    
   // Nav collaps in xs

    $('.navbar-collapse a').click(function(){
    $(".navbar-collapse").collapse('hide');
    });
    // Dropdown

    $(".dropdown-menu li a").click(function(){
      $(this).parents(".dropdown").find('.btn').html($(this).text() + ' <span class="pull-right glyphicon glyphicon-menu-down"></span>');
      $(this).parents(".dropdown").find('.btn').val($(this).data('value'));
    });
     function createSliders(){
      if($.isEmptyObject(mobile_data)){
         createRangeSliders('range_02','slide_range2','range_slider2',0,2000000,500000,10000);
          createRangeSliders('range_03','slide_range3','range_slider3',0,500000,300000,5000); 
          $('.range_slider3 .irs-max').text("$500,000");  
          createRangeSliders('range_06','slide_range6','range_slider6',0,399500,40000,5000);
          createRangeSliders('range_07','slide_range7','range_slider7',0,399500,40000,5000);
           $('.range_slider7 .irs-min').text("$1"); 
           $('.range_slider7 .irs-max').text("$399,500"); 
          createRangeSliders('range_04','slide_range4','range_slider4',47000,2000000,470000,10000);  
          createRangeSliders('range_05','slide_range5','range_slider5',0,430000,258000,5000); 
          if($.isEmptyObject(mobile_data)){  
            $('.zipcode_mobile').prop("disabled", true); 
          }
      }
    }


    // tab content hide and show
    var mobile_data={};
    $(".tabPurchase").click (function(){
        $(".purchase").addClass("selected"); // active 
        $(".Refinance").removeClass("refin_selected");// remove active
        $(".T_Case").removeClass("T_Case_selected");// remove active

        $("#Purchase").addClass("active");
        $("#Refinance").removeClass("active");
        $("#Take_Case").removeClass("active");
         $("#cashout_mobile").removeClass("active");
        $(".mainTab").attr("style","display:none");
        $('.sec_main_tab').css('display','block');
        createSliders();        
        state.chosen_loan_type="new-purchase";  
        if(mobile_data.chosen_loan_type!="" && mobile_data.chosen_loan_type!="new-purchase")
          mobile_data.estVal="";
        mobile_data.chosen_loan_type="new-purchase";     

    });

    
    $(".tabRefinance").click (function(){
        $(".purchase").removeClass("selected"); // active 
        $(".Refinance").addClass("refin_selected");// remove active
        $(".T_Case").removeClass("T_Case_selected");// remove active
        $("#Purchase").addClass("active");
        $("#Refinance").addClass("active");
        $("#Take_Case").removeClass("active");
        $("#cashout_mobile").removeClass("active");
        $(".mainTab").attr("style","display:none");
        $('.sec_main_tab').css('display','block');
        $('.sec_main_tab_cashout').css('display','none');
        createSliders();
        state.chosen_loan_type="refinance"; 
        if(mobile_data.chosen_loan_type!="" && mobile_data.chosen_loan_type!="refinance")
          mobile_data.estVal=""; 
        mobile_data.chosen_loan_type="refinance";              
    });

    $(".tabT_Case").click (function(){
        $(".purchase").removeClass("selected"); // remove active 
        $(".Refinance").removeClass("refin_selected"); // remove active  
        $(".T_Case").addClass("T_Case_selected"); //active 
        $("#cashout_mobile").addClass("active");
        $("#Refinance").removeClass("active");
        $("#Take_Case").addClass("active");
        $(".mainTab").attr("style","display:none");
        $('.sec_main_tab_cashout').css('display','block');
        $('.sec_main_tab').css('display','none');
        createSliders();
        state.chosen_loan_type="cashout";  
         if(mobile_data.chosen_loan_type!="" && mobile_data.chosen_loan_type!="cashout")
          mobile_data.estVal=""; 
        mobile_data.chosen_loan_type="cashout";      
        setTimeout(function() {$('.range_slider7 .irs-min').text('$1');$('.range_slider7 .irs-max').text('$399,500');}, 500);
    });

    $(".sec_next_tab_cashout").click (function(){
       $(".purchase").removeClass("selected"); // remove active 
        $(".Refinance").removeClass("refin_selected"); // remove active  
        $(".T_Case").addClass("T_Case_selected"); //active 
        $("#Purchase").addClass("active");
        $("#cashout_mobile").removeClass("active");
        $("#Refinance").removeClass("active");
        $("#Take_Case").addClass("active");
        $(".mainTab").attr("style","display:none");
        $('.step-1-cahout').css('display','none');
        $('.sec_main_tab_cashout').css('display','none');
        $('.sec_main_tab').css('display','block');
        mobile_data.cashout=accounting.unformat($("#range_07").val());  
       });


  // next step code start
   $(".sec_next_tab").click (function(){
          $("#property_content").addClass("active");
          $("#Purchase").removeClass("active");
          $(".sec_main_tab").attr("style","display:block");
          $('.step-1').removeAttr("style","display:none");
          $('.main_option1').css('display', 'block');
          $(".step-5").attr("style","display:none");
          $(".step-5").removeClass("active");
          mobile_data.zipcode=$("#zipcodeMobile").val();                         
      });

   $(".Condo_tab").click (function(){
          $(".third_next_tab").removeClass("selectedTab");
          mobile_data.residencetype=$(this).data('property-type');
          switch($(this).data('property-type')){
            case 0:              
                mobile_data.residencetype_text="Single Family";
              break;
            case 1:              
                mobile_data.residencetype_text="Condo";
              break;
            case 2:              
                mobile_data.residencetype_text="2 Units";
              break;   
            case 3:              
                mobile_data.residencetype_text="3 Units";
              break;
            case 4:              
                mobile_data.residencetype_text="4 Units";
              break;
          }
          $(".Condo_tab").removeClass("selectedTab");
          $("#select_property").addClass("active");
          $("#property_content").removeClass("active");
          $(".third_main_tab").attr("style","display:block");
          $('.step-2').removeAttr("style","display:none");
          $(".third_next_tab").removeClass("selectedTab");
          $(this).addClass("selectedTab");
        });

  $(".Residence_tab").click (function(){
          mobile_data.propertyuse=$(this).data('residence-type');
          switch($(this).data('residence-type')){
            case 0:              
                mobile_data.propertyuse_text="Primary Residence";
              break;
            case 1:              
                mobile_data.propertyuse_text="Vacation/Second Home";
              break;
            case 2:              
                mobile_data.propertyuse_text="Investment Property";
              break;           
          }
          $(".Residence_tab").removeClass("selectedTab");
          $("#cradit_score").addClass("active");
          $("#select_property").removeClass("active");
          $(".forth_next_tab").attr("style","display:block");
          $('.step-3').removeAttr("style","display:none");
          $(".forth_next_tab").removeClass("selectedTab");
          $(this).addClass("selectedTab");
        });


   $(".fifth_next_tab").click (function(){
		mobile_data.creditscore=$("#slide_range_credit").text();
		mobile_data.creditscore_text=$("#slide_range_credit").text();
        switch(mobile_data.chosen_loan_type){
          case "new-purchase":  
            $("#pro_loc_content").addClass("active");
            $("#cradit_score").removeClass("active");
            $(".fifth_next_tab").attr("style","display:block");
            $('.step-4').removeAttr("style","display:none");
            break;
          case "refinance":
            $("#pro_loc_content_refinance").addClass("active");
            $("#cradit_score").removeClass("active");
            $(".fifth_next_tab").attr("style","display:block");
            $('.step-4').removeAttr("style","display:none");
            break;
          case "cashout":
            $("#pro_loc_content_cashout").addClass("active");
            $("#cradit_score").removeClass("active");
            $(".fifth_next_tab").attr("style","display:block");
            $('.step-4').removeAttr("style","display:none");
            break;
        }  
         
       
    });
    $(".sixth_next_tab").click (function(){
		$("#pro_loc_content_refinance_fha").addClass("active");
        $("#pro_loc_content_refinance").removeClass("active");
        $(".sixth_next_tab").attr("style","display:block");
        $('#pro_loc_content_refinance').removeAttr("style","display:none");
	});
	// next step code end 
    $(".loan-options").click (function(){  
        switch(mobile_data.chosen_loan_type){
          case "new-purchase":    
              mobile_data.purchaseprice=accounting.unformat($("#range_01").val());
              mobile_data.downpayment=accounting.unformat($("#per_range").val());
              mobile_data.downpaymentpercent_text=$(".per_range_slider span#slide_per_range").text();
              mobile_data.fha_text="";
              $("#pro_loc_content").removeClass("active");
			  $(".bac_optionLoanDetails").attr("style","display:block"); 
              break;
           case "refinance":
              mobile_data.purchaseprice=0;
              mobile_data.downpayment=0;
              mobile_data.estval=accounting.unformat($("#range_02").val());
              mobile_data.curmortgagebalance=accounting.unformat($("#range_03").val());
              mobile_data.fha=$("#fha_m").val();
              if($("#fha_m").val()=="FHA-Streamline"){
                mobile_data.fha_text="Yes";
              }else{
                mobile_data.fha_text="No";
              }              
              mobile_data.downpaymentpercent_text="";
			  $("#pro_loc_content_refinance_fha").removeClass("active");
			  $(".bac_optionLoanDetails").attr("style","display:block"); 
              break;  
           case "cashout":
              mobile_data.purchaseprice=0;
              mobile_data.downpayment=0;
              mobile_data.estval=accounting.unformat($("#range_04").val());
              mobile_data.curmortgagebalance=accounting.unformat($("#range_05").val());
              mobile_data.fha="";
              mobile_data.fha_text="";
              mobile_data.downpaymentpercent_text="";
              if($('#range_06').val()==0){
                mobile_data.cashout=accounting.unformat(1);
              }else{
               mobile_data.cashout=accounting.unformat($("#range_06").val());
              }
              
			  $("#pro_loc_content_cashout").removeClass("active");
			  $(".bac_optionLoanDetails").attr("style","display:block"); 
			  break;     
         }
         $('.main_option1').css('display', 'block');
         $(".mobile_rates-listing").css('display', 'block');
         console.log(mobile_data);
         submitLoanDetailsForm(); 
     });

      // one-step back code
    $(".main_option1").click( function(){
	     regressToLoanDetails();
        mobile_data={};
        state.chosen_loan_type=""; 
        $('#mobile_form')[0].reset();    
        $(this).closest('.subhead').removeClass('active');
        $('.zipcode_mobile').prop("disabled", true);
        $(".purchase").removeClass("selected");
        $(".T_Case").removeClass("selected");
        $(".Residence_tab").removeClass("selectedTab");    
        $('.c-page-content__section').css('display', 'none');
        $('.mobile_rates-listing').css('display', 'none');
        $('.mobile_rates-listing_error').css('display', 'none');        
        $('.u-margin-bottom-large').css('display', 'none');
        $(".mainTab").removeClass("selected");
        $(".mainTab").removeAttr("style","display:none");
        $(".mainTab").removeAttr("style","display:none");
       // $("#Purchase").removeClass("style","display:none");
       $('#Purchase').css('display', 'none');
        $("#Purchase").removeAttr("active");
        $("#Refinance").removeClass("active");
        $("#cashout_mobile").removeClass("active");
        $("#cashout_mobile").css('display', 'none');
        $(".Refinance").removeClass("refin_selected");
        $(".T_Case").removeClass("T_Case_selected");         
        $("#Take_Case").removeClass("active");
        $("#cradit_score").removeClass("active");
        $("#pro_loc_content").removeClass("active");
        $("#pro_loc_content_refinance").removeClass("active");
        $("#pro_loc_content_cashout").removeClass("active");
        $("#property_content").removeClass("active");
        $("#select_property").removeClass("active");
		    $('#pro_loc_content_refinance_fha').removeClass("active");
        $(".Condo_tab").removeClass("selectedTab");
        $('.step-4').removeAttr("style","display:none");
        $('.step-3').removeAttr("style","display:none");
        $('.step-2').removeAttr("style","display:none");
    		$(".bac_optionLoanDetails").attr("style","display:none"); 
    		$('#pro_loc_content_refinance').removeAttr("style","display:none");
    		$('#pro_loc_content_refinance_fha').removeAttr("style","display:none");
        $('#zipcode1').val("");
        if($("#range_01").data("ionRangeSlider"))
          $("#range_01").data("ionRangeSlider").reset();   
        if($("#range_02").data("ionRangeSlider"))     
          $("#range_02").data("ionRangeSlider").reset();
        if($("#range_03").data("ionRangeSlider")){
          $("#range_03").data("ionRangeSlider").destroy();
          createRangeSliders('range_03','slide_range3','range_slider3',0,500000,300000,5000); 
           $('#slide_range3').text("$300,000");           
        }
        if($("#range_06").data("ionRangeSlider")){
          $("#range_06").data("ionRangeSlider").destroy();
          createRangeSliders('range_06','slide_range6','range_slider6',0,399500,40000,5000);
           $('#slide_range6').text("$40,000"); 
           var slider6 = $("#range_06").data("ionRangeSlider");
           slider6.update({ from: "40000"});
           
        }
        if($("#range_07").data("ionRangeSlider")){
          $("#range_07").data("ionRangeSlider").destroy();
          createRangeSliders('range_07','slide_range7','range_slider7',0,399500,40000,5000);
           $('#slide_range7').text("$40,000"); 
           var slider7 = $("#range_07").data("ionRangeSlider");
           slider7.update({ from: "40000"});
           $('.range_slider7 .irs-min').text("$1"); 
           $('.range_slider7 .irs-max').text("$399,500"); 
        }
        if($("#range_04").data("ionRangeSlider")){
          $("#range_04").data("ionRangeSlider").destroy();
           createRangeSliders('range_04','slide_range4','range_slider4',47000,2000000,470000,10000); 
           $('#slide_range4').text("$470,000"); 
           var slider4 = $("#range_04").data("ionRangeSlider");
           slider4.update({ from: "470000"});
        }
        if($("#range_05").data("ionRangeSlider")){
          $("#range_05").data("ionRangeSlider").destroy();
           createRangeSliders('range_05','slide_range5','range_slider5',0,430000,258000,5000); 
          $('#slide_range5').text("$258,000"); 
          $('.range_slider5 .irs-max').text("$430,000");
          var slider5 = $("#range_05").data("ionRangeSlider");
           slider5.update({ from: "258000"});
        }
        
        if($("#per_range").data("ionRangeSlider"))
          $("#per_range").data("ionRangeSlider").reset();
        if($("#credit_score_slider").data("ionRangeSlider"))
          $("#credit_score_slider").data("ionRangeSlider").reset();     
        crediScoreSlider();       
        mobile_data.estVal="";      
  });

	$(".fha_Yes").click( function(){
		$(".fha_Yes").addClass("fha_active");
		$(".fha_No").removeClass("fha_active");
		$("#fha_m").val("FHA-Streamline");
	});

	$(".fha_No").click( function(){
		$(".fha_Yes").removeClass("fha_active");
		$(".fha_No").addClass("fha_active");
		$("#fha_m").val("0");
	});

  $(".back6_option").click( function(){
        $(".mainTab").removeAttr("style","display:none");        
        $(this).closest('.subhead').removeClass('active');
        $(this).closest('.subhead').css('display','none');
    });
  $(".back_option").click( function(){
        switch(mobile_data.chosen_loan_type){
            case "new-purchase":   
              $(".mainTab").removeAttr("style","display:none");        
              $(this).closest('.subhead').removeClass('active');
              $(this).closest('.subhead').css('display','none');
              break;
            case "refinance":
              $(".mainTab").removeAttr("style","display:none");        
              $(this).closest('.subhead').removeClass('active');
              $(this).closest('.subhead').css('display','none');
              break;
             case "cashout" :
               $(this).closest('.subhead').removeClass('active');
                $(this).closest('.subhead').css('display','none');
                $('.subhead.step-1 .sec_main_tab_cashout').css('display','block');
                $('.subhead.step-1-cahout').css('display','block'); 
                $('.sec_main_tab_cashout').css('display','block'); 
                setTimeout(function() { $('.range_slider7 .irs-min').text("$1"); 
           $('.range_slider7 .irs-max').text("$399,500"); }, 250);
             break;
          }
    });

    $(".back1_option").click( function(){
      $(this).closest('.subhead').removeClass('active');
      $(this).closest('.subhead').css('display','none');
      $('.subhead.step-1 .sec_main_tab').css('display','block');
      $('.subhead.step-1').css('display','block');
	});
    
	$(".back2_option").click( function(){
      $(this).closest('.subhead').removeClass('active');
      $(this).closest('.subhead').css('display','none');
      $('.subhead.step-2 .third_main_tab').css('display','block');
      $('.subhead.step-2').css('display','block');
    });

    $(".back3_option").click( function(){
      $(this).closest('.subhead').removeClass('active');
      $(this).closest('.subhead').css('display','none');
      $('.subhead.step-3 .forth_main_tab').css('display','block');
      $('.subhead.step-3').css('display','block');
    });

    $(".back4_option").click( function(){
      $(this).closest('.subhead').removeClass('active');
      $(this).closest('.subhead').css('display','none');
      $('.subhead.step-4 .fifth_next_tab').css('display','block');
      $('.subhead.step-4').css('display','block');
    });
	
	$(".back5_option").click( function(){
      $(this).closest('.subhead').removeClass('active');
      $(this).closest('.subhead').css('display','none');
      $('.subhead.step-5 .sixth_next_tab').css('display','block');
      $('.subhead.step-5#pro_loc_content_refinance').css('display','block');
    });	
	  
//form Range slider
	var slMaxVal = '';
function createRangeSliders(sliderId,spanId,classId,minVal, maxVal, fromVal, stepVal){
	$("#"+sliderId).ionRangeSlider({
		type: "single",
         min: minVal,
        max: maxVal,
        from: fromVal,
        keyboard: true,
        prefix:'$ ',
        step: stepVal,
        onStart: function (data) {
            var current_val = data.from;
           	if(current_val < 10000){
      			$('#'+spanId).text("$1");
      			}else{
      				$('#'+spanId).text("$" + current_val.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));	
      			}
      			$('.' + classId + ' .irs-min').text('$1');
            var max_value=data.max;
            if(max_value == 2000000){
              $('.' + classId + ' .irs-max').text('$2M+');
            }else{
              $('.' + classId + ' .irs-max').text("$" + max_value.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));
            }           
        },
        onChange: function (data) {
      			var current_val = data.from;
      			if(current_val < 10000){
      				 $('#'+spanId).text("$1");
      			}
      			if(current_val == 2000000){
                      $('#'+spanId).text('Over $2 million');
      				$('.' + classId + ' .irs-max').text('$2M+');
      			}
      			$('.' + classId + ' .irs-min').text('$1');
             var max_value=data.max;
            if(max_value == 2000000){
              $('.' + classId + ' .irs-max').text('$2M+');
            }else{
              $('.' + classId + ' .irs-max').text("$" + max_value.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));
            }
            if(sliderId == "range_02"){
              slMaxVal = parseInt(current_val);
              mobile_data.estVal=slMaxVal;
              var slider3 = $("#range_03").data("ionRangeSlider");
              slider3.update({ from: data.from * 60/100, max: data.from});
              if(current_val < 10000){$('#slide_range3').text("$1");$('.range_slider3 .irs-max').text('$1');}
              if(current_val == 2000000){ $('.range_slider3 .irs-max').text('$2M+');}else{
                $('.range_slider3 .irs-max').text('$' + current_val.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));
              }        
              $('.range_slider3 .irs-min').text('$1');
            }
            if(sliderId == "range_04"){
              slMaxVal = parseInt(current_val);
              if(mobile_data.cashout==0){
                var slider6val=1;
              }else{
                var slider6val=parseInt(mobile_data.cashout);
              }
              mobile_data.estVal=slMaxVal;
              var slider5Endvalue=parseInt(slMaxVal-slider6val);
              var slider5 = $("#range_05").data("ionRangeSlider");
              slider5.update({ from: (slider5Endvalue*60/100), max: slider5Endvalue});
              $('.range_slider5 .irs-max').text('$' + slider5Endvalue.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));
              $('.range_slider4 .irs-min').text('$' + Math.round(slider6val/.85).toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));     
            }
            if(sliderId == "range_06"){
              if(current_val==0){
                slMaxVal = parseInt(1);
              }else{
                slMaxVal = parseInt(current_val);
              }
               $('#slide_range6').text('$' + slMaxVal.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));
              var slider4val=parseInt($('#range_04').val());
              var slider5Endvalue=parseInt(slider4val-slMaxVal);
              var slider5 = $("#range_05").data("ionRangeSlider");
              slider5.update({ from: (slider5Endvalue*60/100), max: slider5Endvalue});
              $('.range_slider5 .irs-max').text('$' + slider5Endvalue.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));
             if($('#range_06').val()==0){
                var slider6val=1;
              }else{
                var slider6val=parseInt($('#range_06').val());
              }
              var slider4 = $("#range_04").data("ionRangeSlider");

              slider4.update({ from: 470000, min:Math.ceil((slider6val/.85)/10000)*10000,max: 2000000});
              $('.range_slider4 .irs-min').text('$' + Math.round(slider6val/.85).toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));  
            }
             $('#'+spanId).text('$' + current_val.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));
            if(sliderId != "range_04" &&  sliderId != "range_05"){
                 $('.' + classId + ' .irs-min').text('$1');
            }
            $('.range_slider2 .irs-max').text('$2M+');
            $('.range_slider4 .irs-max').text('$2M');      
            $('.range_slider5 .irs-min').text('$0');
           
        },
		onUpdate: function (data) {
      			var current_val = data.from;
      			if(current_val < 10000){
      				$('#'+spanId).text("$1");
      			}
            if(sliderId != "range_04" &&  sliderId != "range_05"){
               $('.' + classId + ' .irs-min').text('$1');
             }else{
                $('.range_slider4 .irs-min').text('$47,059');
                $('.range_slider5 .irs-min').text('$0');
             }
      			//$('.' + classId + ' .irs-min').text('$1');
             var max_value=data.max;
            if(max_value == 2000000){
              $('.' + classId + ' .irs-max').text('$2M+');
            }else{
              $('.' + classId + ' .irs-max').text("$" + max_value.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));
            }
            if(sliderId == "range_02"){
              slMaxVal = parseInt(current_val);
              mobile_data.estVal=slMaxVal;
              var slider3 = $("#range_03").data("ionRangeSlider");
              slider3.update({ from: data.from * 60/100, max: data.from});
              if(current_val < 10000){$('#slide_range3').text("$1");$('.range_slider3 .irs-max').text('$1');}
              if(current_val == 2000000){ $('.range_slider3 .irs-max').text('$2M+');}else{
                $('.range_slider3 .irs-max').text('$' + current_val.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));
              }        
              $('.range_slider3 .irs-min').text('$1');
            }
            if(sliderId == "range_04"){
              slMaxVal = parseInt(current_val);
              if(mobile_data.cashout==0){
                var slider6val=1;
              }else{
                var slider6val=parseInt(mobile_data.cashout);
              }
              mobile_data.estVal=slMaxVal;
              var slider5Endvalue=parseInt(slMaxVal-slider6val);
              var slider5 = $("#range_05").data("ionRangeSlider");
              slider5.update({ from: (slider5Endvalue*60/100), max: slider5Endvalue});
              $('.range_slider5 .irs-max').text('$' + slider5Endvalue.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));
              $('.range_slider4 .irs-min').text('$' + Math.round(slider6val/.85).toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));     
            }
            if(sliderId == "range_06"){
              if(current_val==0){
                slMaxVal = parseInt(1);
              }else{
                slMaxVal = parseInt(current_val);
              }
              $('#slide_range6').text('$' + slMaxVal.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));
              var slider4val=parseInt($('#range_04').val());
              var slider5Endvalue=parseInt(slider4val-slMaxVal);
              var slider5 = $("#range_05").data("ionRangeSlider");
              slider5.update({ from: (slider5Endvalue*60/100), max: slider5Endvalue});
              $('.range_slider5 .irs-max').text('$' + slider5Endvalue.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));
              if($('#range_06').val()==0){
                var slider6val=1;
              }else{
                var slider6val=parseInt($('#range_06').val());
              }
              var slider4 = $("#range_04").data("ionRangeSlider");
              slider4.update({ from: 470000, min:Math.ceil((slider6val/.85)/10000)*10000,max: 2000000});
              $('.range_slider4 .irs-min').text('$' + Math.round(slider6val/.85).toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));  
            }
            if(sliderId != "range_04" &&  sliderId != "range_05"){
                 $('.' + classId + ' .irs-min').text('$1');
            }
            $('.range_slider2 .irs-max').text('$2M+');
            $('.range_slider4 .irs-max').text('$2M');      
            $('.range_slider5 .irs-min').text('$0');
                  
		},
		onFinish: function (data) {
			var current_val = data.from;
      if(sliderId == "range_05"){
  			if(current_val < stepVal){
  				$('#'+spanId).text("$0");
  			}
      }else{
        if(current_val < stepVal){
          $('#'+spanId).text("$1");
        }
      }
      var max_value=data.max;
            if(max_value == 2000000){
              $('.' + classId + ' .irs-max').text('$2M+');
            }else{
              $('.' + classId + ' .irs-max').text("$" + max_value.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));
            }
			if(sliderId == "range_02"){
				slMaxVal = parseInt(current_val);
        mobile_data.estVal=slMaxVal;
				var slider3 = $("#range_03").data("ionRangeSlider");
				slider3.update({ from: data.from * 60/100, max: data.from});
				if(current_val < 10000){$('#slide_range3').text("$1");$('.range_slider3 .irs-max').text('$1');}
				if(current_val == 2000000){	$('.range_slider3 .irs-max').text('$2M+');}else{
          $('.range_slider3 .irs-max').text('$' + current_val.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));
        }        
				$('.range_slider3 .irs-min').text('$1');
			}
			if(sliderId == "range_04"){
        slMaxVal = parseInt(current_val);
        if(mobile_data.cashout==0){
          var slider6val=1;
        }else{
          var slider6val=parseInt(mobile_data.cashout);
        }
        mobile_data.estVal=slMaxVal;
        var slider5Endvalue=parseInt(slMaxVal-slider6val);
        var slider5 = $("#range_05").data("ionRangeSlider");
        slider5.update({ from: (slider5Endvalue*60/100), max: slider5Endvalue});
        $('.range_slider5 .irs-max').text('$' + slider5Endvalue.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));
        $('.range_slider4 .irs-min').text('$' + Math.round(slider6val/.85).toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));     
        $('#slide_range5').text('$' + (slider5Endvalue*60/100).toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));
      }
      if(sliderId == "range_06"){
        if(current_val==0){
          slMaxVal = parseInt(1);
        }else{
          slMaxVal = parseInt(current_val);
        }
         $('#slide_range6').text('$' + slMaxVal.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));
        mobile_data.cashout=slMaxVal;
        var slider4val=parseInt($('#range_04').val());
        var slider5Endvalue=parseInt(slider4val-slMaxVal);
        var slider5 = $("#range_05").data("ionRangeSlider");
        slider5.update({ from: (slider5Endvalue*60/100), max: slider5Endvalue});
        mobile_data.curmortgagebalance=parseInt($('#range_05').val());
        $('.range_slider5 .irs-max').text('$' + slider5Endvalue.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));
        if($('#range_06').val()==0){
          var slider6val=1;
        }else{
         var slider6val=parseInt($('#range_06').val());
       }
        var slider4 = $("#range_04").data("ionRangeSlider");
        slider4.update({ from: 470000, min:Math.ceil((slider6val/.85)/10000)*10000,max: 2000000});
        mobile_data.estVal=parseInt($('#range_04').val());
        $('.range_slider4 .irs-min').text('$' + Math.round(slider6val/.85).toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));  
        //update slider7 value
        var slider7 = $("#range_07").data("ionRangeSlider");
        slider7.update({ from: slider6val});       
        mobile_data.cashout=slider6val;
      }
      if(sliderId == "range_07"){
        if(current_val==0){
          slMaxVal = parseInt(1);
        }else{
          slMaxVal = parseInt(current_val);
        }
        var slider7val=parseInt(slMaxVal);
        mobile_data.cashout=$('#range_07').val();
        //update slider7 value
        var slider6 = $("#range_06").data("ionRangeSlider");
        slider6.update({ from: slider7val});

        $('#slide_range6').text('$' + slider7val.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));
        if(mobile_data.cashout==0){
          var slider6val=1;
        }else{
         var slider6val=parseInt(mobile_data.cashout);
       }
         var slider4 = $("#range_04").data("ionRangeSlider");
        slider4.update({ from: 470000, min:Math.ceil((slider6val/.85)/10000)*10000,max: 2000000});
        mobile_data.estVal=parseInt($('#range_04').val());
        $('.range_slider4 .irs-min').text('$' + Math.round(slider6val/.85).toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));  
        var slider4val=parseInt($('#range_04').val());
        var slider5Endvalue=parseInt(slider4val-mobile_data.cashout);
        var slider5 = $("#range_05").data("ionRangeSlider");
        slider5.update({ from: (slider5Endvalue*60/100), max: slider5Endvalue});
         mobile_data.curmortgagebalance=parseInt($('#range_05').val());
        slider5defaultvalue=(slider5Endvalue*60/100);
        $('.range_slider5 .irs-max').text('$' + slider5Endvalue.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));
        $('#slide_range5').text('$' + slider5defaultvalue.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));
      }

      if(sliderId != "range_04" &&  sliderId != "range_05"){
           $('.' + classId + ' .irs-min').text('$1');
      }
			$('.range_slider2 .irs-max').text('$2M+');
      $('.range_slider4 .irs-max').text('$2M');      
			$('.range_slider5 .irs-min').text('$0');
		}
    });
}

	// Range slider code
	$('.forth_next_tab').click (function(){
	  crediScoreSlider();
	});

	var range_val = 0 ;
	var crediScoreSlider = function () {    
	$("#credit_score_slider").ionRangeSlider({
        type: "single",
		range: "max",
        min: 840,
        max: 1120,
        from: 920,
		keyboard: true,
        step: 1,
		onStart: function (data) {
			var cur_val = parseInt(data.from);
			range_val = 840 - (cur_val - 840) ;
            $('#slide_range_credit').html(range_val); 
        },
        onChange: function (data) {
			var cur_val = parseInt(data.from);
			range_val = 840 - (cur_val - 840) ;
            $('#slide_range_credit').html(range_val); 
        },
        onFinish: function (data) {
			var cur_val = parseInt(data.from);
			range_val = 840 - (cur_val - 840) ;
            $('#slide_range_credit').html(range_val); 
        },
        onUpdate: function (data) {
			var cur_val = parseInt(data.from);
			range_val = 840 - (cur_val - 840) ;
            $('#slide_range_credit').html(range_val); 
        }
	});
  }
var est_amt = 0, p_price, per = 20, slide_range;
  $('.fifth_next_tab').click (function () {
    $("#range_01").ionRangeSlider({
        type: "single",
        min: 0,
        max: 2000000,
        from: 500000,
        keyboard: true,
        prefix:'$ ',
        step: 10000,
        max_postfix: 'M+',
        onStart: function (data) {
			var current_val = data.from;
			if(current_val < 10000){
				slide_range = "$1";
				$(".range_slider #slide_range").text("$1");
			}
            var dis_min_val =  parseInt(current_val);
            slide_range = '$' + dis_min_val;
            var slide_range_val='$' + dis_min_val.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
            $('#slide_range').html(slide_range_val);
            $('.range_slider .irs-max').text('$2M+');
			if(slide_range == "Over $2 million") {p_price = "$2000000"}else{p_price = slide_range};
			est_amt = parseInt(p_price.toString().substring(1,p_price.length)) *  per / 100;
            slide_range = per + '% ($'+ est_amt.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,") +')' ;
            $('#slide_per_range').html(slide_range);
        },
        onChange: function (data) {
			var current_val = data.from;
			var dis_min_val =  parseInt(current_val);
			slide_range = '$' + dis_min_val;
			if(current_val < 10000){
				slide_range = "$1";
				$(".range_slider #slide_range").text("$1");
			}
            if(current_val == 2000000){
                slide_range = 'Over $2 million';
			}
			//  $('#slide_range').html(slide_range);
            $('.range_slider .irs-max').text('$2M+');
			if(slide_range == "Over $2 million") {p_price = "$2000000"}else{p_price = slide_range};
			per = $("#slide_per_range").text().split("%")[0];
			est_amt = parseInt(p_price.toString().substring(1,p_price.length)) *  per / 100;
            slide_range = per + '% ($'+ est_amt.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,") +')' ;
            $('#slide_per_range').html(slide_range);
        },
		onUpdate: function (data) {
			var current_val = data.from;
			var dis_min_val =  parseInt(current_val);
			slide_range = '$' + dis_min_val;
			if(current_val < 10000){
				slide_range = "$1";
				$(".range_slider #slide_range").text("$1");
			}
			if(current_val == 2000000){
				slide_range = 'Over $2 million';
			}
			$('.range_slider .irs-max').text('$2M+');
			if(slide_range == "Over $2 million") {p_price = "$2000000"}else{p_price = slide_range};
			per = $("#slide_per_range").text().split("%")[0];
			est_amt = parseInt(p_price.toString().substring(1,p_price.length)) *  per / 100;
			slide_range = per + '% ($'+ est_amt.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,") +')' ;
			$('#slide_per_range').html(slide_range);
		},
		onFinish: function (data) {
			var current_val = data.from;
			var dis_min_val =  parseInt(current_val);
			slide_range = '$' + dis_min_val;
			if(current_val < 10000){
				slide_range = "$1";
				$(".range_slider #slide_range").text("$1");
			}
			if(current_val == 2000000){
				slide_range = 'Over $2 million';
			}
			$('.range_slider .irs-min').text('$1');
			$('.range_slider .irs-max').text('$2M+');
			if(slide_range == "Over $2 million") {p_price = "$2000000"}else{p_price = slide_range};
			per = $("#slide_per_range").text().split("%")[0];
			est_amt = parseInt(p_price.toString().substring(1,p_price.length)) *  per / 100;
			slide_range = per + '% ($'+ est_amt.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,") +')' ;
			$('#slide_per_range').html(slide_range);
		}
    });

    

    $("#per_range").ionRangeSlider({
        type: "single",
        min: 3,
        max: 99,
        from: 20,
        keyboard: true,
        step: 1,
        postfix: '%',
        onStart: function (data) {
			var current_val = data.from;
            var dis_min_val =  parseInt(current_val);
			per = current_val;
			p_price="$500000";
			est_amt = parseInt(p_price.toString().substring(1,p_price.length)) *  per / 100;
            var slide_range = dis_min_val + '% ($'+ est_amt.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,") +')' ;
            $('#slide_per_range').html(slide_range);
        },
        onChange: function (data) {
			var current_val = data.from;
            var dis_min_val = 0;
            var step = 1;
			dis_min_val = parseInt(current_val);
			per = current_val
			est_amt = parseInt(p_price.toString().substring(1,p_price.length)) *  per / 100;
            var slide_range = dis_min_val + '% ($'+ est_amt.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,") +')' ;
			$('#slide_per_range').html(slide_range); 
        },
        onFinish: function (data) {
			var current_val = data.from;
			var dis_min_val = 0;
			var step = 1;
			dis_min_val = parseInt(current_val);
			per = current_val
			est_amt = parseInt(p_price.toString().substring(1,p_price.length)) *  per / 100;
			var slide_range = dis_min_val + '% ($'+ est_amt.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,") +')' ;
			$('#slide_per_range').html(slide_range);
        },
        onUpdate: function (data) {
            var current_val = data.from;
            var dis_min_val = 0;
            var step = 1;
            dis_min_val = parseInt(current_val);
			per = current_val
			est_amt = parseInt(p_price.toString().substring(1,p_price.length)) *  per / 100;
            var slide_range = dis_min_val + '% ($'+ est_amt.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,") +')' ;
            $('#slide_per_range').html(slide_range);
        }
	});
  setTimeout(function() {
		$('.range_slider .irs-max').text('$2M+');
		$('.range_slider2 .irs-max').text('$2M+');
    $('.range_slider3 .irs-max').text('$500,000');
		$('.range_slider4 .irs-max').text('$2M');   
    $('.range_slider6 .irs-max').text('$399,500');
    $('.range_slider7 .irs-max').text('$399,500');
    $('.range_slider').find('.irs-min').text('$1');
    $('.range_slider2').find('.irs-min').text('$1');
    $('.range_slider3').find('.irs-min').text('$1');
    //$('.range_slider4').find('.irs-min').text('$47,059');
    $('.range_slider5').find('.irs-min').text('$0');
    $('.range_slider6').find('.irs-min').text('$1');
    $('.range_slider7').find('.irs-min').text('$1');
    //$('.range_slider5 .irs-max').text('$430,000');
        if(mobile_data.chosen_loan_type=="refinance")
         var slMaxVal=parseInt("500000"); 
        else if(mobile_data.chosen_loan_type=="cashout")
         var slMaxVal=parseInt("470000"); 
        
        if(mobile_data.estVal!=undefined && mobile_data.estVal!=""){
          slMaxVal = parseInt(mobile_data.estVal);
          $('.range_slider3 .irs-max').text('$' + slMaxVal.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));
        }else{
          if(slMaxVal!=undefined && slMaxVal!="" && mobile_data.chosen_loan_type!="cashout")
            $('.range_slider3 .irs-max').text('$' + slMaxVal.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));
        }
        if(mobile_data.cashout==0){
            var slider6val=1;
          }else{
            var slider6val=parseInt(mobile_data.cashout);
          }

        var slider5Endvalue=parseInt(slMaxVal-slider6val);
        $('.range_slider4').find('.irs-min').text('$' + Math.round(slider6val/.85).toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"))
        $('.range_slider5 .irs-max').text('$' + slider5Endvalue.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));

	}, 300);
  
});
   $( window ).on( "load", function() {
		$('.range_slider').find('.irs-min').text('$1');
		$('.range_slider2').find('.irs-min').text('$1');
		$('.range_slider3').find('.irs-min').text('$1');
		$('.range_slider4').find('.irs-min').text('$47,059');
    $('.range_slider4').find('.irs-max').text('$2M');
    $('.range_slider5').find('.irs-min').text('$0');
		$('.range_slider5').find('.irs-max').text('$430,000');
		$('.range_slider6').find('.irs-min').text('$1');
    $('.range_slider6 .irs-max').text('$399,500');
    $('.range_slider7').find('.irs-min').text('$1');
    $('.range_slider7 .irs-max').text('$399,500');
    $('.range_slider').find('.irs-max').text('$2M+');
		$('.range_slider2').find('.irs-max').text('$2M+');
  });
     $(window).resize(function () {
        setTimeout(function(){
			$('.range_slider .irs-max').text('$2M+'); 
			$('.range_slider').find('.irs-min').text('$1');
			$('.range_slider2 .irs-max').text('$2M+');
			$('.range_slider2').find('.irs-min').text('$1');
			$('.range_slider3').find('.irs-min').text('$1');
			$('.range_slider4 .irs-max').text('$2M');
      $('.range_slider4').find('.irs-min').text('$47,059');
			$('.range_slider5').find('.irs-min').text('$0'); 
      $('.range_slider5').find('.irs-max').text('$430,000');
      $('.range_slider6').find('.irs-min').text('$1'); 
      $('.range_slider6').find('.irs-max').text('$399,500');
      $('.range_slider7').find('.irs-min').text('$1'); 
      $('.range_slider7').find('.irs-max').text('$399,500'); 
        if(mobile_data.chosen_loan_type=="refinance")
         var slMaxVal=parseInt("500000"); 
        else if(mobile_data.chosen_loan_type=="cashout")
         var slMaxVal=parseInt("470000"); 
        if(mobile_data.estVal!=undefined && mobile_data.estVal!=""){
          slMaxVal = parseInt(mobile_data.estVal);
          $('.range_slider3 .irs-max').text('$' + slMaxVal.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));
        }else{
          if(slMaxVal!=undefined && slMaxVal!="" && mobile_data.chosen_loan_type!="cashout")
           $('.range_slider3 .irs-max').text('$' + slMaxVal.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));
        }
        if(mobile_data.cashout==0){
            var slider6val=1;
          }else{
            var slider6val=parseInt(mobile_data.cashout);
          }
        var slider5Endvalue=parseInt(slMaxVal-slider6val);
        $('.range_slider4').find('.irs-min').text('$' + Math.round(slider6val/.85).toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"))
        $('.range_slider5 .irs-max').text('$' + slider5Endvalue.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));

  
    }, 300);
    });        
	$('#creditscoreDesktop').on('input change', function(){
		$('#chanceSlider').text(840 - ($('#creditscoreDesktop').val() - 840));
		 if($('#chanceSlider').text() > "760")
		var slideWidth = Math.ceil((($('#creditscoreDesktop').val() - 840) * 100) / (1120 - 840) + 4);
		else
			var slideWidth = Math.ceil((($('#creditscoreDesktop').val() - 840) * 100) / (1120 - 840));
		$(".credit_score_runnable").width(Math.ceil(slideWidth) + "%");
	});
	$('#priceSlider').on('input change', function(){
			var y = document.getElementById('priceSlider');
			var purchasepriceNew = parseInt($("#purchaseprice").val().replace(/,/g, ""));
			var dp = Math.round(purchasepriceNew * y.value / 100);
			$(".c-linked-percent-slider__percent-value").text(y.value + "%");
			if(dp >= 0)
			$(".c-linked-percent-slider__numeric-value").text("($"+ dp.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,") +")");
			 var overlayslider = y.value;
			 if(y.value > 75)overlayslider = overlayslider - 3;
			 if(y.value < 4)overlayslider = parseInt(overlayslider) + 1;
			$(".overlayslider").css("width", overlayslider + "%");
			$("#downpaymentpercent").val($(".c-linked-percent-slider__percent-value").text() + " " + $(".c-linked-percent-slider__numeric-value").text());
	});
	$( "#purchaseprice" ).keyup(function( event ) {
		var y = document.getElementById("priceSlider");
		var purchasepriceNew = parseInt($("#purchaseprice").val().replace(/,/g, ""));
		var dp = Math.round(purchasepriceNew * y.value / 100);
		$(".c-linked-percent-slider__percent-value").text(y.value + "%");
		if(dp >= 0)
		$(".c-linked-percent-slider__numeric-value").text("($"+ dp.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,") +")");
		$("#downpaymentpercent").val($(".c-linked-percent-slider__percent-value").text() + " " + $(".c-linked-percent-slider__numeric-value").text());
	});
	$(".collapsed-collapsed").on("click", function(){
		$(".c-rates-listing__program_new").removeClass("activeTable");
        $(".c-rates-listing__program_new tr").removeClass("activeRow");
    });
    // Start the show!
    init();

  });
})(jQuery, window, document);
