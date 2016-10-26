define(
  [

    'dojo/on'

  ], function(

    on

  ) {

    function createModalContent(moment, momentTypes) {

      // Determine which modal to create
      var props = moment.attributes,
          modal = document.querySelector('.moment-modal'),
          modalContent = document.querySelector('.moment-content'),
          body = [],
          imgDiv = 'modal-img',
          videoDiv = 'modal-video',
          endDiv = 'modal-end',
          html;

      // Check if moment is start or end
      if (props.Medium === 0) return;

      switch(momentTypes[props.Medium]) {
        // Images
        case 'photo':
          var imgClass = 'moment-img',
              img = '<img src="' + props.MemoryURL + '" class="' + imgClass + '"></img>';

          body.push('<div class="' + imgDiv + '">');
          body.push(img);
          body.push('</div>');
          createDescription(props, body);
          break;

        // Videos
        case 'video':
          var videoClass = 'moment-video',
              video = '<video class="' + videoClass + '" controls autoplay><source src="' + props.MemoryURL + '" type="video/mp4"></video>';

          body.push('<div class="' + videoDiv + '">');
          body.push(video);
          body.push('</div>');
          createDescription(props, body);
          break;

        case 'end':
          createDescription(props, body);
          var end = 'Congratulations! You have completed this path.';
          body.push('<div class="' + endDiv + '">');
          body.push(end);
          body.push('</div>');
          break;

      }

      html = body.join('');
      modalContent.innerHTML = html;
      modal.classList.remove('moment-hidden');

      on.once(modal, 'click', function(e) {
        modal.classList.add('moment-hidden-up');
        setTimeout(function() {
          modal.classList.add('moment-hidden');
          modal.classList.remove('moment-hidden-up');
        }, 400);
      });

    }

    function createDescription(props, body) {

      if (props.Description && props.Description.length > 1) {
        var text = props.Description,
        textDiv = 'modal-text';
        body.push('<div class="' + textDiv + '">');
        body.push(text);
        body.push('</div>');
      }

    }

    return {

      createModalContent: createModalContent

    };

  }
);
