import { newElement, geoLoc } from './util.mjs';

/*
  A component which searches for eateries by location and cuisine.
  The location must be set to the browser's location (from geoLoc()).

  This component has two attributes:

    ws-url:  the base URL (protocol, host, port) where the web
             services are located.
    cuisine: the cuisine to be searched for.

  This component does not do anything when first connected to the DOM.
  It must respond to changes in its attribute values:

    ws-url: when this attribute changes, the component simply remembers
    its value.

    cuisine: when changed, the component should make a web-service call
    to search for eateries for that cuisine with location set to the 
    browser's location.  Then it should set it's content corresponding
    to the pseudo-HTML shown below (dynamic data is shown within ${...} and
    wsData is the data returned from the web-service call):

      <ul class="eatery-results">
	<!-- repeat for each eatery in wsData.eateries -->
	<li>
	  <span class="eatery-name">${eatery.name}</span>
	  <span>${eatery.dist} miles</span>
	  <a href=${links:self.href}>
	    <button>Select</button>
	  </a>
	</li>
      </ul>

    The handler for the Select button should be set up to set
    the eatery-url attribute for the eatery-details component.

    This should be followed by up-to two scrolling links:

      <div class="scroll">
	<!-- only when ${wsData.links:prev} -->
	<a rel="prev" href="${wsData.links:prev.href}">
	  <button>&lt;</button>
	</a>
	<!-- only when ${wsData.links:next} -->
	<a rel="next" href="${wsData.links:next.href}">
	  <button>&gt;</button>
	</a>
      </div>

    When the above scrolling links are clicked, the results should
    be scrolled back-and-forth.

*/

class EateryResults extends HTMLElement {

    static get observedAttributes() { return ['ws-url', 'cuisine',]; }

    async attributeChangedCallback(name, oldValue, newValue) {
        const { lat, lng } = await geoLoc();

        const baseUrl = this.getAttribute('ws-url');
        const cuisine = this.getAttribute('cuisine');
        this.innerHTML = "";
        if ((cuisine !== "")) {
            const result = await this.data(`${baseUrl}/eateries/${lat},${lng}?cuisine=${newValue}`);
            this.dispDataER(result, baseUrl);
            this.scrollER(result.links);

        }
    }
    async dispDataER(result, baseUrl) {
        this.innerHTML = '';
        const list = [];
        for (let item of Object.values(result.eateries)) {

            const sName = newElement('span', { class: 'eatery-name' }, item.name);
            const sDist = newElement('span', {}, `${parseFloat(item.dist).toFixed(2)} miles`);
            const button = newElement('button', {}, 'Select');
            const anc = newElement('a', { class: 'select-eatery', href: `${baseUrl}/eateries/${item.id}` }, button);
            button.addEventListener('click', ev => {
                document.querySelector('eatery-details').setAttribute('eatery-url', ev.currentTarget.parentNode.href);
                ev.preventDefault();
            });
            const li = newElement('li', { class: 'eatery-name' }, sName, sDist, anc);
            list.push(li);
        }

        const ul = newElement('ul', { class: 'eatery-results' }, ...list);
        this.append(ul);
    }
    async scrollER(link) {
        const anchors = [];
        if (getHref(link, 'next') !== undefined) {
            const but = newElement('button', {}, '>');
            const anchor = newElement('a', { rel: 'next', href: getHref(link, 'next') }, but);;
            anchor.addEventListener('click', async ev => {
                ev.preventDefault();
                const res = await this.data(ev.currentTarget.href);
                this.dispDataER(res, this.getAttribute('ws-url'));
                this.scrollER(res.links);
            })
            anchors.push(anchor);
        }

        if (getHref(link, 'prev') !== undefined) {
            const but = newElement('button', {}, '<');
            const anchor = newElement('a', { rel: 'prev', href: getHref(link, 'prev') }, but);;
            anchor.addEventListener('click', async ev => {
                ev.preventDefault();
                const res = await this.data(ev.currentTarget.href);
                this.dispDataER(res, this.getAttribute('ws-url'));
                this.scrollER(res.links);
            })
            anchors.push(anchor);
        }

        const div = newElement('div', { class: 'scroll' }, ...anchors);
        this.append(div);
    }

    

    async data(url) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
            const results = await response.json();
            return results;
        }
        catch (err) {
            return err;
        }
    }


    //TODO auxiliary methods
}


//register custom-element as eatery-results
customElements.define('eatery-results', EateryResults);


/*
  A component which shows the details of an eatery.  

  When created, it is set up with a buyFn *property* which should be
  called with an eatery-id and item-id to order a single unit of the
  item item-id belonging to eatery-id.

  The component has a single attribute: eatery-url which is the url
  for the web service which provides details for a particular eatery.

  This component does not do anything when first connected to the DOM.
  It must respond to changes in its eatery-url attribute.  It must
  call the web service corresponding to the eatery-url and set it's
  content corresponding to the pseudo-HTML shown below (dynamic data
  is shown within ${...} and wsData is the data returned from the
  web-service call):


      <h2 class="eatery-name">${wsData.name} Menu</h2>
      <ul class="eatery-categories">
	<!-- repeat for each category in wsData.menuCategories -->
	<button class="menu-category">${category}</button>
      </ul>
      <!-- will be populated with items for category when clicked above -->
      <div id="category-details"></div>

  The handler for the menu-category button should populate the
  category-details div for the button's category as follows:

      <h2>${category}</h2>
      <ul class="category-items">
	<!-- repeat for each item in wsData.flatMenu[wsData.menu[category]] -->
	<li>
	  <span class="item-name">${item.name}</span>
	  <span class="item-price">${item.price}</span>
	  <span class="item-details">${item.details}</span>
	  <button class="item-buy">Buy</button>
	</li>
      </ul>

  The handler for the Buy button should be set up to call
  buyFn(eatery.id, item.id).

*/
class EateryDetails extends HTMLElement {

  static get observedAttributes() { return [ 'eatery-url', ]; }
  
   
  async attributeChangedCallback(name, oldValue, newValue) {
    //TODO 
    this.innerHTML = ""; 
    const wsData = await getFetch(this.getAttribute('eatery-url'));
    //console.log (wsData.id);
    const hdr = newElement('h2', { class: 'eatery-name' }, `${wsData.name} Menu`);
    this.append(hdr);
    const ulx = newElement('ul',  { class: 'eatery-categories' });
    const divx = newElement('div', { id: 'category-details'});
    for (const category of wsData.menuCategories){
    const button = newElement('button',{class : 'menu-category'},`${category}`);
    button.addEventListener('click', ev => {
      
     // const divx = document.querySelector("#category-details");
      divx.innerHTML = "";
      const catHdr = newElement('h2', {},`${category}`);
      divx.append(catHdr);
      const ulCat = newElement('ul',  { class: 'category-items' });
      for (const id of wsData.menu[category])
      {
      	const liCat = newElement('li');
      	const sName = newElement('span',  { class: 'item-name' }, `${wsData.flatMenu[id].name}`);
      	//console.log (wsData.flatMenu[id].id);
      	const sPrice = newElement('span',  { class: 'item-price' }, `${wsData.flatMenu[id].price}`);
      	const sDetails = newElement('span',  { class: 'item-details' }, `${wsData.flatMenu[id].details}`);
      	const sButton = newElement('button',  { class: 'item-buy' }, 'Buy');
      	//sButton.add
      	sButton.addEventListener('click', ev => {
      	ev.preventDefault();
      	this.buyFn(wsData.id, wsData.flatMenu[id].id);
      	}); 
      	liCat.append(sName, sPrice, sDetails, sButton);
      	ulCat.append(liCat);
      }
      divx.append(ulCat);
      ev.preventDefault();
    });
    ulx.append(button);
    }
    this.append(ulx);
    this.append(divx);
  }    
  //TODO auxiliary methods
  
}

async function getFetch(url)
{
  try {
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    });
    const results = await response.json();
    
  return results;
  }
  catch (err)
  {
   //return err;
  }
}


//register custom-element as eatery-details
customElements.define('eatery-details', EateryDetails);

/** Given a list of links and a rel value, return the href for the
 *  link in links having the specified value.
 */
function getHref(links, rel) {
  return links.find(link => link.rel === rel)?.href;
}

//TODO auxiliary functions
