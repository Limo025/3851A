import React from 'react'


function Footer() {
  return (
    <div>
        <div id="end">
            <div id="endContents">
                <a href="https://www.newcastle.edu.au/">
                    <img src="/src/img/uniLogo.jpg" alt="University of Newcastle" width="200"/>
                </a>
                <p className='text-20px'><br/><br/>The University of Newcastle acknowledges the traditional custodians of the lands
                within our footprint areas: Awabakal, Darkinjung, Biripai, Worimi, Wonnarua, 
                and Eora Nations. We also pay respect to the wisdom of our Elders past and 
                present.<br/><br/>
                DISCLAIMER: Every effort has been made to ensure the accuracy of the information
                on this website. However, changes to courses and programs may occur. The 
                University accepts no responsibility for any information supplied on this web 
                site or any actions taken on the basis of the information. Users are advised 
                to seek confirmation of the information from the relevant area of the University.</p>
            </div>
        </div>
    </div>
  )
}

export default Footer