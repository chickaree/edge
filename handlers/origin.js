function originHandler({ request }) {
  return fetch(request);
}

export default originHandler;
